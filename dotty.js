var socket = io.connect('http://mindsforge.com:4444');

/**
* Functions
**/

//Dot drawing function
function place_circle(obj){
  var x = obj.x,
      y = obj.y,
      color = obj.color;
  var ctx = $('canvas#dotty-canv')[0].getContext('2d');
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI*2, true);
  ctx.closePath();
  ctx.fillStyle = '#'+color;
  ctx.fill();

}

//Add new artist DIV
function add_artist(id){

  //if artist DIV exists, do nothing
  if($('div#'+ id +'.artist').length){
  } else {

    //Select container DIV and append artist class div with unique ID
    $('div#artist-display').append('<div class=\"artist\" id=\"'+ id + '\">');
  }
}

//Remove artist DIV
function rm_artist(id){

  //Select container DIV and remove artist class div with unique ID
  $('div#'+ id +'.artist').remove();
}


//Update artist DIV
function update_artist(obj){

  //Select div with ID, and apply CSS
  $('div.artist#'+obj.id).css('background-color', '#'+obj.color);
}

//Function to broadcast color
function send_color(){
  var color = $('input.color').val();
  obj = { color: color, id: id };
  socket.emit('update_color', obj);
  update_artist(obj);
}

//Warning message function
function warn(msg){
  $('div.warning').html(msg).fadeIn(200).delay(1500).fadeOut(200);
}

/**
* Socket.IO events
**/

//Recieve WELCOME from server
socket.on('welcome', function(data){

  //Global variables
  id = data.id;

  //Check if you're the excluded id
  if(data.exclude_id == id){
    turn_flag = false;
  } else {
    turn_flag = true;
  }

  //Loop through dot data and draw canvas
  for(var i = 0; i<data.dots.length; i++){
    place_circle(JSON.parse(data.dots[i]));
  }

  //Loop through existing IDs
  data.other_ids.forEach(add_artist);

  //append your marker to the end of the others
  add_artist(id);
  send_color();
  socket.emit('ready');
});

//Recieve EXCLUDE ID event
socket.on('exclude_id', function(data){

  //Set turn flag
  if(data == id){
    turn_flag = false;
  } else {
    turn_flag = true;
  }

  //Visually show excluded artist
  var exclude_player = $('div#' + data + '.artist');
  var exclude_pos = exclude_player.position();
  $('img#exclude-turn').animate({ top : exclude_pos.top,
                                  left: exclude_pos.left - 2 }, 25);
});

//Recieve PLACE DOT event from server
socket.on('place_dot', function(data){

  //Add circle to context
  place_circle(data);
});

//New user connection
socket.on('new_artist', function(data){

  //Update the newcomer on yor current color
  send_color();

  //Only add if not yourself
  if(data != id){
    add_artist(data);
  }
});

//User leave
socket.on('leave', function(data){
  rm_artist(data);
});

//Update color
socket.on('update_color', function(data){
  update_artist(data);
});

/**
* DOM JavaScript
**/

$(document).ready(function(){

  //Initialize color picker to random color
  $('input.color').val(Math.floor(Math.random()*16777215).toString(16));

  //Change cursor when hovering canvas
  $('canvas#dotty-canv').hover(function(){
    $(this).css('cursor', 'crosshair');
  });

  //Click event listener on canvas
  $('canvas#dotty-canv').click(function(e){

    var canv = $('canvas#dotty-canv');
    var scroll_top = $(window).scrollTop();
    var scroll_left = $(window).scrollLeft();

    //check if if it's your turn (it's checked serverside too, no hacking)
    if(turn_flag == true){

      //Create dot info object
      var obj = { x: e.clientX - canv.offset().left - scroll_left - 2,
                  y: e.clientY - canv.offset().top + scroll_top - 2,
                  color: $('input.color').val() };

      //Draw dot clientside
      place_circle(obj);

      //Send server dot info
      socket.emit('place_dot', obj);
    } else {
      warn('Wait until someone else places a dot! Invite a friend.')
    }
  });

  //Broadcast color change when color selector changes
  $('input.color').change(function(){
    send_color();
  });
});
