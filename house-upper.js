'use strict';
// placeholder, replaced by the room pass
houseArt.registerRoom({id:'house_landing',length:800,paint(c,L,K){K.shell(c,L,'upper');K.stairsDown(c,180);K.windowFrame(c,34,70,66,84,{view:'yard'});},foreground(c,time,K){K.stairsDownFront(c,180);},lights(time,K){return [K.windowLight(34,70,66,84)];}});
