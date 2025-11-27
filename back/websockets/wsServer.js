const db = require('../config/database');
const ws = require('ws')

const messageType = {
  LIKED: 'liked',
  UNLIKED: 'unliked',
  MATCH: 'match',
  MESSAGE_SENT: 'message'
}

const socketMap = new Map([]);

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

async function createWsClient(id, ws){
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
  return new wsClient(id, users[0].username, users[0].profile_picture, ws);
}

server.on('connection', function connection(clientWs) {
  clientWs.on('message', function message(data) {
    const messageJSON = JSON.parse(data.toString());
    const messageText = messageJSON['message'];
    if (messageText != undefined){
      if (messageText.startsWith('init')){
        initClientWebSocketConnection(messageText, clientWs);
      }else{  // chat message need be sent in this format : `{sender_id}->{receiver_id}:${message}`
        handleClientChatMessage(messageText);
      }
    }
  });

  clientWs.on('close', function close() {
    socketMap.forEach((value, key)=>{
      socketMap.set(key, value.filter((socket)=>{
        // console.log(socket);
        // console.log(key, socket.ws.readyState);
        if (socket.ws.readyState == ws.CLOSED){
          console.log(`Update connect date of user with id : ${key}`);
          db.execute("UPDATE users SET last_connection_date = ? WHERE id = ?", [new Date(), key]);  
        }
        return socket.ws.readyState != ws.CLOSED;
      }));
    })
    // console.log("Clients after disconnection")
    // printClientList();
  });
});

async function initClientWebSocketConnection(messageText = "", clientWs){
  try{
    id = Number.parseInt(messageText.split(":")[1]);
    if(socketMap.get(id) == undefined || socketMap.get(id).length == 0){
      var client = await createWsClient(id, clientWs)
      socketMap.set(id, [client])
    }
    else{
      socketMap.get(id).push(socketMap.get(id)[0].duplicateWithNewWs(clientWs));
    }
    // printClientList();
  }
  catch(error){
    console.log("Error while saving ws in map, cause : ", error);
  }
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
  }
  catch(error){
    console.log(`Error while processing message : ${messageText}\nCause : ${error}`)
  }
}

function sendMessage(fromUserId, toUserId, content = "", type){
  if (socketMap.get(toUserId)){
    var sender = socketMap.get(fromUserId)[0];
    socketMap.get(toUserId).forEach((client)=>{
      client.ws.send(JSON.stringify({
        type: type,
        from: JSON.stringify({
          id: fromUserId, 
          username: sender.username, 
          profile_picture: sender.pfp_url
        }),
        content: content
      }))
    })
  }
}


function printClientList(){
  Array.from(socketMap).forEach((value)=>{
    console.log(`id : ${value[0]}, number of clients connected : ${value[1].length}`);
    if (value[1].length > 0){
      console.log(`\tUsername : ${value[1][0].username} | pfp : ${value[1][0].pfp_url}`)
    }
  })
}

module.exports = {server, sendMessage, messageType};