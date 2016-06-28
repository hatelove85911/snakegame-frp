import Rx from 'rxjs/Rx'
import {
    Observable as Ob
} from 'rxjs/Observable'
import $ from 'jquery'

// const Ob = Rx.Observable

const log = (x) => console.log(x)

const start = document.querySelector('#start')
const pauseOrCont = document.querySelector('#pauseOrCont')
const statusText = document.querySelector('#status')

const direction = {
    left: {
        x: -1,
        y: 0
    },
    down: {
        x: 0,
        y: 1
    },
    up: {
        x: 0,
        y: -1
    },
    right: {
        x: 1,
        y: 0
    }
}

const levels = [{
    level: 1,
    speed: 500,
    food: 3,
    map: ['wwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        'w                           ww',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwww'
    ]
}, {
    level: 2,
    speed: 250,
    food: 5,
    map: ['wwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        'w                          www',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwww'
    ]
}, {
    level: 3,
    speed: 100,
    food: 6,
    map: ['wwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        'w                         wwww',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'w                            w',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwww'
    ]
}]

const initSnakePosition = [{
    x: 3,
    y: 2
}, {
    x: 4,
    y: 2
}, {
    x: 5,
    y: 2
}]
const addPoint = (p1, p2) => ({
    x: p1.x + p2.x,
    y: p1.y + p2.y
})
const isPointEq = (p1, p2) => p1.x === p2.x && p1.y === p2.y

const randomFood = () => ({
    x: Math.floor(Math.random() * 15) + 1,
    y: Math.floor(Math.random() * 15) + 1
})

// move snake keyboard stream
const move$ = Ob.fromEvent(document, 'keypress')
    .filter(evt => {
        let keycode = evt.which || evt.keyCode
        return [104, 106, 107, 108].some(d => d === keycode)
    })
    .map(evt => {
        let keycode = evt.which || evt.keyCode
        if (keycode === 104) return direction.left
        if (keycode === 106) return direction.down
        if (keycode === 107) return direction.up
        if (keycode === 108) return direction.right
    })
    .startWith(direction.down)

// ************************************************
// level change
// ************************************************
// frame success proxy
const success$ = new Rx.Subject()

// level change stream
const levelChange$ = Ob.zip(Ob.from(levels.slice(1)), success$, (level, xxx) => level)
    .startWith(levels[0])
    .publish()

// ************************************************
// game status stream
// ************************************************
// start button stream
const start$ = Ob.fromEvent(start, 'click').mapTo('s')
    // pause or continue stream
const pauseOrCont$ = Ob.fromEvent(pauseOrCont, 'click').mapTo('p')

// game status stream
const gameStatus$ = Ob.merge(start$, pauseOrCont$)
    .scan((acc, curr) => {
        // 0, not started yet
        // 1, started
        // 2, paused
        if (acc === 1 && curr === 'p') return 2
        if (acc === 2 && curr === 'p') return 1
        if (acc === 0 && curr === 's') return 1
        return acc
    }, 0)
    .startWith(0)

// game started stream
const gameOn$ = gameStatus$.filter(s => s === 1)

// ************************************************
// game interval stream
// ************************************************

const gameInterval$ = Ob.combineLatest(gameOn$, levelChange$, (xxx, level) => level)
    .switchMap((level) => Ob.interval(level.speed)
        .takeUntil(Ob.fromEvent(pauseOrCont, 'click'))).publish()

const proxySnake$ = new Rx.Subject()
const snake$ = Ob.of(initSnakePosition).merge(proxySnake$)

const generateFoodTiming$ = new Rx.Subject()
const generateFood$ = Ob.merge(levelChange$.take(1), generateFoodTiming$)
    .map(() => {
        return randomFood()
    }).do(log).publish()

const foodCount$ = Ob.merge(generateFoodTiming$.mapTo(-1), levelChange$.map(level => level.food))
    .scan((acc, curr) => acc + curr, 0).do(log).publish()



foodCount$.filter(x => x === 0)
    .delay(10)
    .subscribe(success$)

const nextPosition$ = gameInterval$
    .withLatestFrom(move$, snake$, (i, direction, snake) => addPoint(direction, snake[0]))
    .withLatestFrom(levelChange$, snake$, generateFood$, (nextPos, level, snake, food) => {
        let what = ''
        let nextBodyPositions = snake.slice()
        nextBodyPositions.pop()

        // check if it's wall
        if (level.map[nextPos.y][nextPos.x] === 'w') what = 'w'
        else if (nextBodyPositions.some(body => isPointEq(body, nextPos))) what = 's'
        else if (isPointEq(food, nextPos)) what = 'f'
        else what = 'e'

        return {
            nextPos,
            what
        }
    }).publish()

const moveToEmpty$ = nextPosition$.filter(nextPos => nextPos.what === 'e')
    .withLatestFrom(snake$, (nextPos, snake) => {
        let nextSnake = snake.slice()
        nextSnake.pop()
        nextSnake.unshift(nextPos.nextPos)
        return nextSnake
    })

const moveToFood$ = nextPosition$.filter(nextPos => nextPos.what === 'f')
    .withLatestFrom(snake$, (nextPos, snake) => {
        let nextSnake = snake.slice()
        nextSnake.unshift(nextPos.nextPos)
        return nextSnake
    })

Ob.merge(moveToEmpty$, moveToFood$).subscribe(proxySnake$)
moveToFood$.delay(10).subscribe(generateFoodTiming$)

// //////////////////////////////////////////////////////////////////////////////////////
// subscription
// //////////////////////////////////////////////////////////////////////////////////////
levelChange$.subscribe(level => {
    $('#level').text(level.level)
    $('#speed').text(level.speed)
        // $('#food').text(level.food)
    $('#map').empty()
    level.map.map(row => {
        let $row = $('<tr>')
        row.split('').map(cell => {
            let $cell = $('<td>')
            if (cell === 'w') $cell.addClass('wall')
            if (cell === ' ') $cell.addClass('empty')
            if (cell === 's') $cell.addClass('snake')
            if (cell === 'h') $cell.addClass('head')
            $row.append($cell)
        })
        $('#map').append($row)
    })

    // $('td').removeClass('snake')
    // s.map(b => {
    //     $('tbody').children().eq(b.y).children().eq(b.x).addClass('snake')
    // })

    // $('td').removeClass('food')
    // $('#map').children().eq(p.y).children().eq(p.x).addClass('food')
})

gameStatus$.subscribe(x => {
    if (x === 0) statusText.innerHTML = 'Not Started'
    else if (x === 1) statusText.innerHTML = 'Started'
    else if (x === 2) statusText.innerHTML = 'Paused'
})

generateFood$.subscribe(p => {
    $('td').removeClass('food')
    $('#map').children().eq(p.y).children().eq(p.x).addClass('food')
})

foodCount$.subscribe(count => {
    $('#foodleft').text(count)
})

nextPosition$.connect()
gameInterval$.connect()
generateFood$.connect()
foodCount$.connect()
levelChange$.connect()

// these two subscription must stay below the levelchange$ connect because we need 
// to have a map first, then we can draw snake and food on the map accordingly

snake$.subscribe(s => {
    $('td').removeClass('snake')
    s.map(b => {
        $('tbody').children().eq(b.y).children().eq(b.x).addClass('snake')
    })
})