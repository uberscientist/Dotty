var io = require('socket.io').listen(4444),
    crypto = require('crypto'),
    redis = require('redis');

//Socket.IO setup
//Lower default debug level to clean up console
io.set('log level', 1);

//Redis setup
db = redis.createClient();

//Crypto function
function md5(plaintext, callback){
  var md5 = crypto.createHash('md5').update(plaintext).digest('hex');
  if(typeof(callback) == 'function'){
    callback(md5);
  }
}

/**
* 'connection' event handler
**/
io.sockets.on('connection', function(socket){

var ip_addr = socket.handshake.address.address; 

console.log('connection.....');
md5(ip_addr, function(ip_hash){
  welcome(ip_hash);
});

/**
*  Socket.IO events
**/
  
  //Let server know DOM/Canvas/Artists are loaded clientside
  socket.on('ready', function(){
    console.log('recieved ready');

    //Get the user's IP hash
    md5(ip_addr, function(ip_hash){

      //Check if Redis has record of ID
      db.sismember('dotty:ids', ip_hash, function(err, data){
        if(err) throw err;
        if(data == 1){
          console.log('already connected');
        } else {
          console.log('new connection');

          //Add new ID to set
          db.sadd('dotty:ids', ip_hash, function(){
              io.sockets.emit('new_artist', ip_hash);
          });
        }
      });
    });
  });

  //Client changes their color
  socket.on('update_color', function(data){
    io.sockets.emit('update_color', data);  
  });

  //PLACE DOT event handler
  socket.on('place_dot', function(data){

    //Some clients send long floats for the y coord, round it
    data.y = Math.round(data.y);

    var string_data = JSON.stringify(data);

    //Get the user's IP hash
    md5(ip_addr, function(ip_hash){

      //See who placed the last dot from Redis
      db.get('dotty:exclude-id', function(err, exclude_id){

        //Check if you can place a dot
        if(ip_hash == exclude_id){

          //Not your turn!
        } else {

          //add dot info to dot Redis list and exlude ID from placing next
          db.multi()
            .rpush('dotty:dots', string_data)
            .set('dotty:exclude-id', ip_hash)
            .exec(function(err){
              if(err) throw err;

              //Broadcast dot object to all connected
              socket.broadcast.emit('place_dot', data);

              //Emit exclude id to everyone
              io.sockets.emit('exclude_id', ip_hash);
          });
        }
      });
    });
  });

  //On disconnect event
  socket.on('disconnect', function(){
    console.log('Disconnect...');

    //Remove member from ip set
    md5(ip_addr, function(ip_hash){
      db.srem('dotty:ids', ip_hash, function(){

        //Let everyone know who left
        socket.broadcast.emit('leave', ip_hash);
      });
    });
  });

//Function to emit welcome data
function welcome(ip_hash){
  console.log('welcome: ' + ip_hash);
  db.multi()
    .get('dotty:exclude-id')
    .smembers('dotty:ids')
    .lrange('dotty:dots',0,-1)
    .exec(function(err, replies){
      if(err) throw err;
      socket.emit('welcome', {'id'        : ip_hash,
                              'exclude_id': replies[0],
                              'other_ids' : replies[1],
                              'dots'      : replies[2]});
    });
}

});
