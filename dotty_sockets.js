var io = require('socket.io').listen(4444),
    crypto = require('crypto'),
    redis = require('redis');

//Socket.IO setup
//Lower default debug level to clean up console
io.set('log level', 1);

//Redis setup
db = redis.createClient();

//Crypto function
function md5(plaintext){
  var md5 = crypto.createHash('md5').update(plaintext).digest('hex');
  return md5;
}



//On connection event
io.sockets.on('connection', function(socket){

  //Get the user's IP address
  var ip = socket.handshake.address.address;

  //Make MD5 hash of it
  var ip_hash = md5(ip);

  //Check if Redis has record of ID
  db.sismember('dotty:ids', ip_hash, function(err, data){
    if(data == 1){
      console.log('user already connected');
      welcome(ip_hash);
    } else {
      welcome(ip_hash);
      socket.broadcast.emit('new_artist', ip_hash);

      //Add new ID to set
      db.sadd('dotty:ids', ip_hash);
    }
  });
/**
  socket.IO events
**/
  //On update of color
  socket.on('update_color', function(data){
    //data.id and .color
    socket.broadcast.emit('update_color', data);  
  });

  //On recieving new dot info
  socket.on('place_dot', function(data){
    var string_data = JSON.stringify(data)

    //add dot info to dot set
    db.sadd('dotty:dots',string_data , function(){

      //Broadcast dot object to all connected
      socket.broadcast.emit('place_dot', data);
    });

    //push dot info to the dot stack
    db.lpush('dotty:dot-stack', string_data);
  });

  //On disconnect event
  socket.on('disconnect', function(){

    //Remove member from ip set
    db.srem('dotty:ids', ip_hash, function(){

      //Let everyone know who left
      socket.broadcast.emit('leave', ip_hash);
    });
  });

//Emit welcome data
function welcome(ip_hash){
    db.smembers('dotty:ids', function(err, ids){
      db.smembers('dotty:dots', function(err, dots){
        socket.emit('welcome', {'id': ip_hash,
                                'other_ids': ids,
                                'dots': dots});
      });
  });
}

});
