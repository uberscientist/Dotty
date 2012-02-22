var io = require('socket.io').listen(4444),
    crypto = require('crypto'),
    redis = require('redis');

//Global array to store and order connected artists
roto = [];
console.log(roto);

//Socket.IO setup
//Lower default debug level to clean up console
io.set('log level', 1);

//Redis setup
db = redis.createClient();

//Prototype a rotate method for Arrays
Array.prototype.rotate = function(n) {
  return this.slice(n, this.length).concat(this.slice(0, n));
}

//Crypto function
function md5(plaintext){
  var md5 = crypto.createHash('md5').update(plaintext).digest('hex');
  return md5;
}


//On connection event
io.sockets.on('connection', function(socket){

console.log('Connection... roto: ' + roto);
//Cycle every 3 seconds
if(typeof(roto_interval) !== 'undefined') {
  console.log('roto_interval\'s type:' + typeof(roto_interval));
  console.log('so the interval has started');
} else {
  console.log('Now we begin the interval');
  roto_interval = setInterval(cycle, 3000);
}


  //Get the user's IP address
  var ip = socket.handshake.address.address;

  //Make MD5 hash of it
  var ip_hash = md5(ip);

  //Check if Redis has record of ID
  db.sismember('dotty:ids', ip_hash, function(err, data){
    if(data == 1){

      //Welcome the duplicate client
      welcome(ip_hash);
    } else {

      //Add new ID to set
      db.sadd('dotty:ids', ip_hash, function(){

        //Add ID to rotation array
        roto.push(ip_hash);

        //Welcome the newcomer
        welcome(ip_hash);

        //Announce the new client
        socket.broadcast.emit('new_artist', ip_hash);
      });
    }
  });

/**
  Socket.IO events
**/

  //On update of color
  socket.on('update_color', function(data){

    //Broadcast data.id and .color and update avatar
    socket.broadcast.emit('update_color', data);  
  });

  //On recieving new dot info
  socket.on('place_dot', function(data){
    var string_data = JSON.stringify(data);

    //add dot info to dot Redis list
    db.rpush('dotty:dots',string_data , function(){

      //Broadcast dot object to all connected
      socket.broadcast.emit('place_dot', data);
    });
  });

  //On disconnect event
  socket.on('disconnect', function(){
    console.log('Disconnect... roto: ' + roto);

    //Remove member from ip set
    db.srem('dotty:ids', ip_hash, function(){

      //Remove ID from rotation array
      var index = roto.indexOf(ip_hash);
      if(index != -1) roto.splice(index, 1);


      //Let everyone know who left
      socket.broadcast.emit('leave', ip_hash);
    });
  });

//Interval function for determining and broadcasting turns
function cycle(){
  if(roto.length < 1){
    console.log('Clearing interval...');
    clearInterval(roto_interval);
    roto_interval = undefined;
    return;
  } else {
    var current_id = roto[0];
    console.log('Broadcasting current id:' + current_id);
    socket.broadcast.emit('next', current_id);
    roto = roto.rotate(1);
    return;
  }
}

//Function to emit welcome data
function welcome(ip_hash){
  console.log('welcome: ' + ip_hash);
  db.smembers('dotty:ids', function(err, ids){
    db.lrange('dotty:dots',0,-1, function(err, dots){
      console.log('grabbing dots from redis...');
      socket.emit('welcome', {'id': ip_hash,
                              'other_ids': ids,
                              'dots': dots});
    });
  });
}

});
