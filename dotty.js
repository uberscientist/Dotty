var socket = io.connect('http://localhost:4444');

function place_circle(x,y,color){
  var ctx = $('canvas#dotty-canv')[0].getContext('2d');
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI*2, true);
  ctx.closePath();
  ctx.fillStyle = '#'+color;
  ctx.fill();
}

function update(x,y,color){
  socket.emit('place_dot',{x: x,
                           y: y,
                           color: color});
}

socket.on('welcome', function(data){
});

socket.on('place_dot', function(data){
  place_circle(data.x, data.y, data.color);
});

$(document).ready(function(){
  var canv = $('canvas#dotty-canv');
  canv.click(function(e){
    var x = e.clientX - canv.offset().left - 3;
    var y = e.clientY - canv.offset().top - 5;
    var color = $('input.color').val();
    place_circle(x,y,color);
    update(x,y,color);
  });
});
