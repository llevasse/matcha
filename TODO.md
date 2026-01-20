# registration & sign-in
- [x] Register with email, username, first and last name, and a password
- [x] Send confirmation email to user 
- [x] Login with username and a password
- [x] Send email to reset password
- [x] Log out in one click from anywhere

# User profile
- [x] Users must provide : their gender, sexual preferences, biography, interest, 5 picture at most
- [x] Users must be able to modify all their info, including their first and last name, and their email address
- [x] The user must be able to check who viewed their profile
- [x] The user must be able to see who liked their profile
- [x] The user must have a public fame rating
- [x] The user must be located using their GPS, or IP location, and must be able to modify their position
- [x] A user profile is consider complete and okay to display to other user if they have 1 profile picture

# Browsing
- [ ] Only propose interesting profile (See subject)
- [x] The list must be :
  - [x] Sortable by age|location|fame|tags
    - [x] age
    - [x] location
    - [x] fame
    - [x] tags
  - [x] Filterable by age|location|fame|tags
    - [x] age
    - [x] location
    - [x] fame
    - [x] tags

# Research
- [x] The user must be able to search profile with criteria such as :
  - [x] Age gap
  - [x] Fame rating
  - [x] Location
  - [x] One or multiple tags

# Profile of other user
- [x] The client must be able to see the profile of other user and see all their (non-sensitive) info
- [x] When a user view a profile, it must be added to their view history
- [x] the client must be able to like another user profile
- [x] the client must be able to unlike another user profile
- [x] Consider two user connected if they liked each other
- [x] see the fame rating of another user
- [x] See if a user is online, or the last time they were online
  - [x] User online status
  - [x] User last connection time
- [ ] A client must be able to report a profile
- [ ] A client must be able to block a user
  - [x] A blocked user must not be shown in the search result
  - [x] will not be able to generate notification
  - [ ] prevent conversation
  - [ ] must be unblock on the profile page

# Chat 
- [x] If two user matched, they must be able to chat in real time

# Notifications 
- [x] A client must receive a notification in real time when :
  - [x] They receive a like
  - [x] Their profile has been viewed
  - [x] They received a message
  - [x] They had a match
  - [x] They are unliked



chores :

Remove french comment (or anything french)
Remove todo in back folder
Add 500 for every failed db transaction and 400 when it's just a bad request
fix all errors, warnings and notices from the web console (must be empty)
Self test
test on real mobile device