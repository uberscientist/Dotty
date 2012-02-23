var socket = io.connect('http://mindsforge.com:4444');

/**
  Functions
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

//Update server with new dot info
function update(obj){
  socket.emit('place_dot',{ x     : obj.x,
                            y     : obj.y,
                            color : obj.color});
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
  $('div.warning').html(msg);
  $('div.warning').fadeIn(200, function(){
    $(this).fadeOut(1000);
  });
}

//Check socket, reload if needed FF fix
function check_ws(){
  if(typeof(turn_flag) === 'undefined'){
    location.reload(true);
  }
}


/**
  Socket.IO events
**/

//Recieve NEXT signal from server
socket.on('next', function(data){

  var active_player = $('div#' + data + '.artist');
  var active_pos = active_player.position();
  $('img#current-turn').animate({ top : active_pos.top - 17,
                                  left: active_pos.left - 2 }, 100);
  if(data == id){
    turn_flag = true;
  } else {
    turn_flag = false;
  }
});


//Recieve WELCOME from server
socket.on('welcome', function(data){

  //Global id variable
  id = data.id;

  //Loop through dot data and draw canvas
  for(var i = 0; i<data.dots.length; i++){
    place_circle(JSON.parse(data.dots[i]));
  }

  //Loop through existing IDs
  data.other_ids.forEach(add_artist);

  //append your marker to the end of the others
  add_artist(id);
  send_color();
});

//Recieve dot broadcast from server
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
  DOM JavaScript
**/

$(document).ready(function(){

  //Reload page after 4 seconds if can't hear broadcasts
  setTimeout('check_ws()', 6000);

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

    //check if if it's your turn
    if(turn_flag == true){

      //Create dot info object
      var obj = { x: e.clientX - canv.offset().left - scroll_left - 2,
                  y: e.clientY - canv.offset().top + scroll_top - 2,
                  color: $('input.color').val() };

      //Draw dot clientside
      place_circle(obj);

      //Send server dot info
      update(obj);
    } else {
      warn('Woah there! It\'s almost your turn.')
    }
  });

  //Broadcast color change when color selector changes
  $('input.color').change(function(){
    send_color();
  });
});
