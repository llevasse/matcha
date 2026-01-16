const db = require('../config/database');
const ws = require('ws')

const debug_ws = true;
const ws_print_color = `\x1b[36m`;
console.log(`Ws debug print color : ${ws_print_color}cyan`);

const messageType = {
  LIKED: 'liked',
  UNLIKED: 'unliked',
  MATCH: 'match',
  MESSAGE_SENT: 'message',
  VIEWED: 'viewed',
  ONLINE: 'online',
  OFFLINE: 'offline',
}

const socketMap = new Map([]);
const watchedUserMap = new Map([]); // {WATCHED_USER_ID : [wsClient, wsClient, ...]}

const server = new ws.Server({ noServer: true })

class wsClient{
  constructor(id, username = null, pfp_url = null, ws = null) {
    this.id = id;  
    this.username = username;
    this.pfp_url = pfp_url;
    this.ws = ws;
  }
  
  duplicateWithNewWs(newWs){
    return new wsClient(this.id, this.username, this.pfp_url, newWs);
  }
  
  id = "";
  username = "";
  pfp_url = "";
  ws = null;
}

async function setWsClientDetails(id){
  const [users] = await db.execute(
      `SELECT u.id, u.username, pp.file_path as profile_picture
      FROM users u
      LEFT JOIN profile_pictures pp ON u.id = pp.user_id AND pp.is_main = TRUE
      WHERE u.id = ?`,
      [id]
  );
  if (users.length === 0){
    throw "User not found"
  }
  socketMap.get(id).forEach((client)=>{
    client.username = users[0].username;
    client.pfp_url = users[0].profile_picture;
  });
}

server.on('connection', function connection(clientWs) {
  clientWs.on('message', async function message(data) {
    const messageJSON = JSON.parse(data.toString());
    const messageText = messageJSON['message'];
    if (messageText != undefined){
      if (debug_ws)
        console.log(ws_print_color+messageText);
      if (messageText.startsWith('init')){
        await initClientWebSocketConnection(messageText, clientWs);
      }
      else if (messageText.startsWith('watch')){
        setUserAsWatch(messageText);
      }
      else if (messageText.startsWith('unwatch')){
        unsetUserAsWatched(messageText);
      }
      else if (messageText.startsWith('viewed')){
        handleClientViewedMessage(messageText);
      }
      else{  // chat message need be sent in this format : `{sender_id}->{receiver_id}:${message}`
        handleClientChatMessage(messageText);
      }
      // console.log("")
      
      // if (debug_ws)
      //   printWatchedList();
    }
  });

  clientWs.on('close', function close() {
    socketMap.forEach((value, key)=>{
      socketMap.set(key, value.filter((client)=>{
        if (client.ws.readyState == ws.CLOSED){
          console.log(`${ws_print_color}Update connect date of user with id : ${key}`);
          db.execute("UPDATE users SET last_connection_date = ? WHERE id = ?", [new Date(), key]);  
          if (watchedUserMap.get(client.id) != undefined && watchedUserMap.get(client.id).length != 0){
            watchedUserMap.get(client.id).forEach((curClient)=>{
              sendMessage(client.id, curClient.id, "", messageType.OFFLINE);
            })
          }
        }
        return client.ws.readyState != ws.CLOSED;
      }));
    })
    if (debug_ws){
      console.log(`${ws_print_color}Clients after disconnection`)
      printClientList();
      console.log("")
    }
  });
});

async function setUserAsWatch(messageText = ""){ // "watch : $watcherId->$watchedId"
  unsetUserAsWatched(messageText);
  ids = messageText.split(":")[1].split("->");
  watcherId = Number.parseInt(ids[0]);
  watchedId = Number.parseInt(ids[1]);
  if (debug_ws){
    console.log(`${ws_print_color}Set user(${watchedId}) as watched`);
  }
  clients = socketMap.get(watcherId)
  if (watchedUserMap.get(watchedId) == undefined || watchedUserMap.get(watchedId).length == 0){
    watchedUserMap.set(watchedId, clients);
  }
  else{
    clients.forEach((client)=>{
      if (socketMap.get(watchedId)){
        socketMap.get(watchedId).push(client);
      }
    })
  }
  if (socketMap.get(watchedId) != undefined && socketMap.get(watchedId).length != 0){
    sendMessage(watchedId, watcherId, "", messageType.ONLINE);
  }
  if (debug_ws){
    printWatchedList();
  }
}

async function unsetUserAsWatched(messageText = ""){ // "unwatch : $watcherId->$watchedId"
  ids = messageText.split(":")[1].split("->");
  watcherId = Number.parseInt(ids[0]);
  watchedId = Number.parseInt(ids[1]);
  if (debug_ws){
    console.log(`${ws_print_color}Unset user(${watchedId}) as watched`);
  }
  if (watchedUserMap.get(watchedId) == undefined || watchedUserMap.get(watchedId).length == 0 || clients.length == 0){
    return
  }
  else{
    if (watchedUserMap.get(watchedId)){
      watchedUserMap.set(watchedId, watchedUserMap.get(watchedId).filter((curClient) => {
        return curClient.id != watcherId;
      }));
    }
    
  }
  if (debug_ws){
    printWatchedList();
  }
}

async function handleClientViewedMessage(messageText = ""){ // "viewed : $viewerId->$viewedId"
  ids = messageText.split(":")[1].split("->");
  let viewerId = Number.parseInt(ids[0]);
  let viewedId = Number.parseInt(ids[1]);
  sendMessage(viewerId, viewedId, "", messageType.VIEWED);
}

async function initClientWebSocketConnection(messageText = "", clientWs){
  var client = null;
  try{
    id = Number.parseInt(messageText.split(":")[1]);
    if(socketMap.get(id) == undefined || socketMap.get(id).length == 0){
      socketMap.set(id, [new wsClient(id, null, null, clientWs)])
      setWsClientDetails(id);
    }
    else{
      socketMap.get(id).push(new wsClient(id, null, null, clientWs));
    }
    if (watchedUserMap.get(id) != undefined && watchedUserMap.get(id).length != 0){
      watchedUserMap.get(id).forEach((curClient)=>{
        sendMessage(id, curClient.id, "", messageType.ONLINE);
      })
    }
    if (debug_ws){
      console.log(`${ws_print_color}Clients after connection`)
      printClientList();
    }
  }
  catch(error){
    console.log(`${ws_print_color}Error while saving ws in map, cause : ${error}`);
  }
  return client;
}

function handleClientChatMessage(messageText = ""){
  try{
    var split = messageText.split(":");
    var info = split[0].split("->");
    var receiverId = Number.parseInt(info[1]);
    var senderId = Number.parseInt(info[0]);
    
    // const content = `${senderId}:${message}`;
    sendMessage(senderId, receiverId, messageText, messageType.MESSAGE_SENT)
    sendMessage(senderId, senderId, messageText, messageType.MESSAGE_SENT)
    console.log("")
  }
  catch(error){
    console.log(`${ws_print_color}Error while processing message : ${messageText}\nCause : ${error}`)
  }
}

function sendMessage(fromUserId, toUserId, content = "", type){
  if (socketMap.get(toUserId)){
    try {
      var sender = socketMap.get(fromUserId)[0];
      const obj = JSON.stringify({
        type: type,
        from: JSON.stringify({
          id: fromUserId, 
          username: sender.username, 
          profile_picture: sender.pfp_url
        }),
        content: content
      });
      socketMap.get(toUserId).forEach((client)=>{
        if (debug_ws){
          console.log(`${ws_print_color}Send ${obj} to ${client.id}`)
        }
        client.ws.send(obj)
      })
    }
    catch(e){
      console.error("Could not send message : ", e);
    }
  }
}


function printClientList(){
  Array.from(socketMap).forEach((value)=>{
    console.log(`${ws_print_color}id : ${value[0]}, number of clients connected : ${value[1].length}`);
    if (value[1].length > 0){
      console.log(`${ws_print_color}\tUsername : ${value[1][0].username} | pfp : ${value[1][0].pfp_url}`)
    }
    console.log("");
  })
}

function printWatchedList(){
  Array.from(watchedUserMap).forEach((value)=>{
    // console.log(ws_print_color+value);
    if (value[1] == null) return;
    console.log(`${ws_print_color}id : ${value[0]}, number of clients watching : ${value[1].length}`);
    value[1].forEach((client)=>{
      console.log(`${ws_print_color}\tUsername : ${client.username}`)
    })
  })
  console.log("");
}

module.exports = {server, sendMessage, messageType};