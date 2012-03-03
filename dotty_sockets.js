var io = require('socket.io').listen(4444),
    crypto = require('crypto'),
    redis = require('redis');

//Global array to store and order connected artists
roto = [];

//Socket.IO setup
//Lower default debug level to clean up //console
io.set('log level', 1);

//Redis setup
db = redis.createClient();

//Prototype a rotate method for Arrays
Array.prototype.rotate = function(n) {
  return this.slice(n, this.length).concat(this.slice(0, n));
}

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

//console.log('connection.....');
md5(ip_addr, function(ip_hash){
  welcome(ip_hash, function(){});
});

//On ready TEST
socket.on('ready', function(){
  //console.log('recieved ready');

  //Get the user's IP hash
  md5(ip_addr, function(ip_hash){

    //Check if Redis has record of ID
    db.sismember('dotty:ids', ip_hash, function(err, data){
      if(err) throw err;
      if(data == 1){
        //TEST: Do nothing if id already connected
        //console.log('already connected');
      } else {
        //console.log('new connection');

        //Add new ID to set
        db.sadd('dotty:ids', ip_hash, function(){

          //Add ID to rotation array
          if(roto.indexOf(ip_hash) == -1){
            roto.push(ip_hash);

            //console.log('roto[...]: ' + roto);
            io.sockets.emit('new_artist', ip_hash);

            //Cycle every 3 seconds if interval doesn't exist already
            if(typeof(roto_interval) == 'undefined') {
              //console.log('Now we begin the turn broadcasts!');
              roto_interval = setInterval(cycle, 3000);
            }
          }
        });
      }
    });
  });
});

/**
*  Socket.IO events
**/
  

  //On update of color
  socket.on('update_color', function(data){

    //Broadcast data.id and .color and update avatar
    io.sockets.emit('update_color', data);  
  });

  //On recieving new dot info
  socket.on('place_dot', function(data){
    var string_data = JSON.stringify(data);

    //Get the user's IP hash
    md5(ip_addr, function(ip_hash){
      //console.log('Trying to place dot: ' + ip_hash);
      //console.log('On this guys turn: ' + roto[0]);
      if(ip_hash == roto[0]){

        //add dot info to dot Redis list
        db.rpush('dotty:dots',string_data , function(){

          //Broadcast dot object to all connected
          socket.broadcast.emit('place_dot', data);
        });
      }
    });
  });

  //On disconnect event
  socket.on('disconnect', function(){
    //console.log('Disconnect... roto: ' + roto);

    //Remove member from ip set
    md5(ip_addr, function(ip_hash){
      db.srem('dotty:ids', ip_hash, function(){

        //Remove ID from rotation array
        var index = roto.indexOf(ip_hash);
        if(index != -1) roto.splice(index, 1);

        //Let everyone know who left
        socket.broadcast.emit('leave', ip_hash);
      });
    });
  });

//Interval function for determining and broadcasting turns
function cycle(){
  //console.log('Roto Length: ' + roto.length);
  if(roto.length < 1){
    //console.log('clearing interval');
    clearInterval(roto_interval);
    roto_interval = undefined;
  } else {
    roto = roto.rotate(1);
    var current_id = roto[0];
    //console.log('Turn id:' + current_id + ' broadcast');
    io.sockets.emit('next', current_id);
  }
}

//Function to emit welcome data
function welcome(ip_hash, callback){
  //console.log('welcome: ' + ip_hash);
  db.smembers('dotty:ids', function(err, ids){
    db.lrange('dotty:dots',0,-1, function(err, dots){
      //console.log('grabbing dots from redis...');
      socket.emit('welcome', {'id': ip_hash,
                              'other_ids': ids,
                              'dots': dots});
      if(typeof(callback) == 'function'){
        callback();
      }
    });
  });
}

});
