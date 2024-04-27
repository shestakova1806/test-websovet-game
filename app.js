// объект игры
app = {};

app.conf_card_w = 52;
app.conf_card_h = 52*300/271;
app.conf_card_offset_top = 130;
app.conf_card_offset_left = 7;
app.conf_card_incard_top_offset = 2.5;
app.puzz = []; // текущий уровень тут хранится.
app.card_ids_list = [1,2,3,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];//какие в целом плитки есть в игре (дизайнеры нарисовали)
/*это можно раскомментить, чтобы был тупой уровень*/ //app.card_ids_list = [1,2,3];
app.board = []; // тут хранятся данные в текущей панельке.
app.board_limit = 8; // текущий размер доски


$(document).ready(function(){

  app.generateSampleLevel();

  app.cardStatus.recalculate();
  app.render.renderCards();

});


// функции для рендера
app.render = {};
/*
 * отрендерить карточки из массива app.puzz
 */
app.render.renderCards = function(){
  $('.wr-cards .cards').html(''); // очистка поля
  // render
  for(var level in app.puzz){
    for(var y in app.puzz[level]){
      for(var x in app.puzz[level][y]){
        var elem = app.puzz[level][y][x];
        app.render.drawCardByData(level, y, x, elem.card_id, elem.status);
      }
    }
  }
  return;
};
/*
 * отрисовка карточки согласно поданным на вход данным
*/
app.render.drawCardByData = function(level, y, x, card_id, status){
  var top = y * (app.conf_card_h/2) - app.conf_card_incard_top_offset*y  + app.conf_card_offset_top;
  var left = x * (app.conf_card_w/2) + app.conf_card_offset_left;
  level = parseInt(level);

  $('.wr-cards .cards').append(
    $('<div class="card"></div>')
      .css('top', top+'px')
      .css('left', left+'px')
      .css('z-index', 10+level)
      .addClass('card-'+level+'-'+y+'-'+x)
      .addClass('c'+String(card_id).padStart(2, '0'))
      .attr('onclick','app.clickCard('+level+','+y+','+x+')')
      .addClass((status==1)?'':'disabled')
  );
  return;
};
/*
 * Перерисовать 'disabled' для всех карточек на поле
 * перерисовываем не все, а только те, у которых изменилось поле
 * сравниваем past_status и status
*/
app.render.redrawDisabledForAllCards = function(){
  for(var level in app.puzz){
    for(var y in app.puzz[level]){
      for(var x in app.puzz[level][y]){
        var elem = app.puzz[level][y][x];
        if(elem.status != elem.past_status){
          var $card = $('.wr-cards .cards .card-'+level+'-'+y+'-'+x);
          $card.removeClass('disabled').addClass((elem.status==1)?'':'disabled');
        }
        //
      }
    }
  }
}

// перемешать карточки на поле
app.shuffleCards = function () {
  const allCards = [...app.puzz[0].flat(), ...app.puzz[1].flat(), ...app.puzz[2].flat(), ...app.puzz[3].flat()];
  let allIds = allCards.map(obj => obj.card_id);

  shuffle(allIds);

  for (let level in app.puzz) {
    app.puzz[level].forEach(array => {
      if (array.length) {
        array.forEach(element => {
          if (element) {
            element.card_id = allIds[0];
            allIds.splice(0, 1);
          }
        })
      }
    })
    level++;
  }

  app.render.renderCards();
}

/*
 * Клик по карточке, на вход подаётся данные по какой карточке
 */
app.clickCard = function(level, y, x){
  level = parseInt(level);
  y = parseInt(y);
  x = parseInt(x);
  if(!(app.puzz && app.puzz[level] && app.puzz[level][y] && app.puzz[level][y][x] && app.puzz[level][y][x].status == 1))
    return false; // не сможем отработать клик (скорее всего карточка залочена)


  var $card = $('.wr-cards .cards .card-'+level+'-'+y+'-'+x);
  // добавляем плитку в нижнюю панель
  var result = app.boardAddCard(app.puzz[level][y][x].card_id, $card);
  // проверяем, есть ли место в нижней панельке.

  if(result == false){
    return false;
  }

  // удаляем объект из массива
  delete app.puzz[level][y][x];

  $card.removeClass('.card-'+level+'-'+y+'-'+x);

  // пересчитываем заблокированные карточки (массив же изменился)
  app.cardStatus.recalculate();
  // перерисовываем статусы карточек
  app.render.redrawDisabledForAllCards();

  return;
};

// добавляем карточку в нижнюю панельку, если возможно.
// возвращает true или false (смогли или нет)
app.boardAddCard = function(card_id, $card){
  // проверяем есть ли в панельке место
  if(app.board.length+1 > app.board_limit){
    app.gameOver(); // переписать на отложенную проверку
    return false;
  }

  var slot_num = app.boardGetSlotForNewCard(card_id);
  if(slot_num==-1){
    slot_num = app.board.length;// считается с нуля, т.е. по этому равно длинне списка
  }else{
    // нужно сдвинуть все плашки после num
    app.boardMoveAllCardsRightAfterNum(slot_num);
    slot_num++; // ставим же в сл. ячейку
  }

  var in_slot_id = makeid(10);
  app.board[slot_num] = {card_id: card_id, 'in_slot_id': in_slot_id};

  $card.addClass('inslot-'+in_slot_id);
  var $slot = $('.wr-cards .cards-board .slot'+slot_num);
  var offset = $slot.offset();
  $card.css('z-index',1000+slot_num);
  $card.animate({
    width: $slot.width(),
    height: $slot.height(),
    top: offset.top,
    left: offset.left

  }, 500, function() {
    // Animation complete.
    app.boardCheckAndUpdate();
    $(this).addClass('completeInPanel');
  });

  return true;
}

// получает последний номер слота для текущего card_id,
// т.е. плитки найдены две в слоте 2 и 3 - вернёт - 3.
// если не найдено, вернёт -1.
app.boardGetSlotForNewCard = function(card_id){
  var slot_num = -1; // -1  - not found
  for(var key in app.board){
    if(!app.board[key]){// чрезвычайеая ситуёвина
      console.log('error in app.boardGetSlotForNewCard; run: app.boardDeleteSpaceAndMoveLeft()');
      app.boardDeleteSpaceAndMoveLeft();
      return;
    }
    var current_card_id = app.board[key].card_id;
    if(card_id==current_card_id){
      slot_num = key;
    }
  }

  return slot_num;
};

// сдвигает плитки вправо после slot_num
app.boardMoveAllCardsRightAfterNum = function(slot_num){
  var board_len = app.board.length;
  for(var i = board_len-1; i>=0; i--){
    var card = app.board[i];

    if(i>slot_num){
      app.board[i+1] = app.board[i];
      app.board[i] = false;
      var $card = $('.inslot-'+card.in_slot_id);
      app.boardMoveCardInBoard($card, i, i+1);
    }
  }
};

// перемещает плитку по слоту
app.boardMoveCardInBoard = function($card, from_slot, to_slot){
  var $slot = $('.wr-cards .cards-board .slot'+to_slot);
  var offset = $slot.offset();
  $card.css('z-index',1000+to_slot);

  $card.animate({
    width: $slot.width(),
    height: $slot.height(),
    top: offset.top,
    left: offset.left

  }, 300, function() {
    // Animation complete.
  });
};

// проверка нет ли 3х фишек на доске и убираем если есть
app.boardCheckAndUpdate = function(){
  var last_card_id = 0; // тут храним прошлый id плитки
  var last_cart_count = 0; // тут сколько плиток таких было до этого
  for(var key in app.board){
    var current_card_id = app.board[key].card_id;
    if(last_card_id==current_card_id){
      last_cart_count++;
    }else{
      last_card_id=current_card_id;
      last_cart_count = 1; // одна же карточка уже была встречена
    }

    if(last_cart_count==3){
      app.boardDeleteCardsById(current_card_id)
      return;
    }
  }
};
// удаляет карточки по заданном card_id
app.boardDeleteCardsById = function(card_id){
  var classes = [];
  for(var key in app.board){
    var card = app.board[key];

    if(card.card_id == card_id && classes.length<3){
      classes.push('.inslot-'+card.in_slot_id+'.completeInPanel');
      delete app.board[key];
    }
  }
  // проверка на то, встали ли прилки в панель, можно ли анимировать или чутка подождать
  // хитрость в том, что плитки нужно убрать именно 3. Сразу.
  classes = classes.join(', ');
  app.boardAnimateDeleteCardsByClasses(classes, 0);
  //-
};
// функция убирания трёх плиток с панельки сразу.
app.boardAnimateDeleteCardsByClasses = function(classes, iteration_count){
  iteration_count++;
  if(iteration_count>20){ // примерное 2 секунды не дождались плиток.
    console.log('error');
    return;
  }
  var len = $(classes).length;
  console.log('mega-len: '+len);
  if(len!=3){
    setTimeout(function(){
      app.boardAnimateDeleteCardsByClasses(classes, iteration_count);
    },200);
    return;
  }
  // корректное поведение
  $(classes).css('background-size', '100%');
  $(classes).animate({
    //opacity: 0,
    backgroundSize: '20%'
  }, 400, function(){
    $(this).remove();
      setTimeout(function(){app.boardDeleteSpaceAndMoveLeft()}, 100);
  });
}

// Удаляет пустые места и сдвигает плитки в право
app.boardDeleteSpaceAndMoveLeft = function(){
  // баг фикс вообще тупой, если ооочень много кликать
  if(app.board[NaN]) delete app.board[NaN];

  var board_has_empty = true;
  while(board_has_empty){
    board_has_empty = false; // предполагаем, что нет, но если найдем хоть 1 элемент - выставим переменную в true.

    var len = app.board.length;
    var hole_slot = -1; // старый слот, который мы нашли с дыркой
    var puzz_slot = -1; // новый, где нашли карточку

    for(var i=0; i<len; i++){
      var card = app.board[i];
      if(!card && hole_slot == -1){//пустая ячейка и до этого не находили.
        board_has_empty = true;
        hole_slot = i;
      }
      if(card && hole_slot != -1){//не пустая ячейка и до этого - находили дырку
        puzz_slot = i;
        var $card = $('.inslot-'+card.in_slot_id);
        app.boardMoveCardInBoard($card, puzz_slot, hole_slot);
        app.board[hole_slot] = app.board[puzz_slot];
        delete app.board[puzz_slot];
        break; // запуск следующий цикл проверки
      }
    }
    if(hole_slot != -1 && puzz_slot == -1){
      // проверка на то, раз мы нашли пустую ячейку, но не была найдена ячейка, которую нужно туда поместить.
      //значит это конец списка, удаляем такой пустой элемент
      app.board.splice(hole_slot, 1);
    }
    //--
  }
};


// получить слуайный card id доступных
app.getRandomCardId = function(){
  return app.card_ids_list[randomInteger(0, app.card_ids_list.length-1)];
};


app.gameOver = function(){
  alert('Game over, pls refresh for new game');
};
