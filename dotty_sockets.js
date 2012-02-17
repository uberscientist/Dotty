var io = require('socket.io').listen(4444),
    crypto = require('crypto'),
    redis = require('redis');

//Socket.IO setup
//Lower default debug level to clean up console
io.set('log level', 1)

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
  var ip = socket.handshake.address.address,

  //Make MD5 hash of it
      ip_hash = md5(ip);

  //Check if Redis has record of ID
  db.sismember('dotty:ids', ip_hash, function(err, data){
    if(data == 1){
      console.log('user already connected');
    } else {

      //Get connected user IDs
      db.smembers('dotty:ids', function(err, data){
        socket.emit('welcome', {'id': ip_hash,
                                'other_ids': data});

        //Add new ID to set
        db.sadd('dotty:ids', ip_hash)
      });
    }
  });

  //On recieving new dot info
  socket.on('place_dot', function(data){
    socket.broadcast.emit('place_dot', data);
  });

  //On disconnect event
  socket.on('disconnect', function(){

    //Remove member from ip set
    db.srem('dotty:ids', ip_hash);
  });
});
