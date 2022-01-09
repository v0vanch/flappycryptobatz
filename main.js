const resourcesUrls = [
  ...Array.from({ length: 19 }).map((v, i) => ['bat_' + i, 'bat_' + i + '.png']),
  ...Array.from({ length: 2 }).map((v, i) => ['obstacle_top_' + i, 'obstacle_top_' + i + '.png']),
  ...Array.from({ length: 2 }).map((v, i) => ['obstacle_bottom_' + i, 'obstacle_bottom_' + i + '.png']),
  ['click', 'click.wav'],
  ['wing', 'wing.wav'],
  ['hit', 'hit.wav'],
]

const textStyle = new PIXI.TextStyle({
  fontFamily: 'PixelSplitter',
  fontSize: 24,
})

const createButton = (params = {
  x: 0, y: 0, width: 50, height: 50, radius: 16,
}) => {
  const btn = new PIXI.Container()

  btn.x = params.x
  btn.y = params.y

  const g = new PIXI.Graphics()

  g.lineStyle(5, 0x5c4330, 1)
  g.beginFill(0xe3e1be, 1)
  g.drawRoundedRect(
    -params.width / 2, -params.height / 2,
    params.width, params.height,
    params.radius ?? 16)
  g.endFill()

  btn.addChild(g)

  params.text && (() => {
    const text = new PIXI.Text(params.text, textStyle)
    text.anchor.set(0.5);
    btn.addChild(text)
  })()

  g.interactive = true
  g.buttonMode = true

  params.onClick && g.on('pointerdown', params.onClick)

  return btn
}

const intersects = (player, obst) => {
  const x1 = player.x - player.width / 2
  const y1 = player.y - player.height / 2
  const w1 = player.width - 40
  const h1 = player.height - 40

  const x2 = obst.parent.x - obst.width * obst.anchor.x
  const y2 = obst.y - obst.height * obst.anchor.y
  const w2 = obst.width - 40
  const h2 = obst.height - 40

  return (x1 < x2 + w2) && (x1 + w1 > x2) && (y1 < y2 + h2) && (y1 + h1 > y2)
}

class App {
  highScore = 0
  currentScore = 0

  currentBat = 0

  constructor(container) {
    this.app = new PIXI.Application({ width: 640, height: 480 })
    container.appendChild(this.app.view)
    this.loader = PIXI.Loader.shared
    this.ticker = PIXI.Ticker.shared
    this.loadResources()
    this.highScore = localStorage.getItem('highScore') || 0
  }

  playSound(name) {
    const sound = this.loader.resources[name].data
    sound.currentTime = 0
    sound.play()
  }

  loadResources() {
    const text = new PIXI.Text('loading', {
      ...textStyle,
      fill: ['#ffffff']
    })
    text.position = this.screenCenter
    text.anchor.set(0.5)

    this.app.stage.addChild(text)
    
    for (const res of resourcesUrls) {
      this.loader.add(res[0], './assets/' + res[1])
    }
    this.loader.load(() => {
      this.loader.resources.click.data.volume = 0.5
      this.loader.resources.wing.data.volume = 0.3
      this.loader.resources.hit.data.volume = 0.3
      
      text.text = 'click here to continue'
      text.interactive = text.buttonMode = true

      text.on('pointerdown', () => {
        this.setupBg()
        this.setupNewGameScene()
        text.destroy({ children: true })
      })
    })
  }

  setupBg() {
    this.bg = PIXI.Sprite.from(document.querySelector("#bgVid"))
    this.bg.preload = 'auto'
    this.bg.anchor.set(0.5)
    this.bg.scale.set(1.2)
    this.bg.position = this.screenCenter
    this.app.stage.addChild(this.bg)

    this.bg.texture.baseTexture.resource.source.loop = true
  }

  setupNewGameScene() {
    this.currentBat = 0
    const center = this.screenCenter

    this.bg.filters = [new PIXI.filters.BlurFilter(8)]

    const scene = new PIXI.Container()

    const bat = new PIXI.Sprite(this.loader.resources['bat_' + this.currentBat].texture)
    bat.anchor.set(0.5)
    bat.scale.set(0.5)
    bat.x = center.x
    bat.y = center.y - 25
    scene.addChild(bat)

    const highScoreText = new PIXI.Text('high score: ' + this.highScore, {
      ...textStyle,
      fill: ['#ffffff'],
    })
    highScoreText.x = center.x
    highScoreText.y = center.y - 150
    highScoreText.anchor.set(0.5)

    scene.addChild(highScoreText)

    const newGameBtn = createButton({
      x: center.x, y: center.y + 125, width: 100, height: 50,
      text: 'Play', onClick: () => {
        this.playSound('click')
        scene.destroy({ children: true })
        this.setupInGameScene()
      }
    })

    scene.addChild(newGameBtn)

    const changeChar = (val) => {
      this.currentBat += val
      this.currentBat %= 19
      bat.texture = this.loader.resources['bat_' + this.currentBat].texture
    }

    const prevCharBtn = createButton({
      x: center.x - 175, y: center.y, width: 50, height: 50,
      text: '<', onClick: () => {
        this.playSound('click')
        changeChar(-1)
      }
    })

    scene.addChild(prevCharBtn)

    const nextCharBtn = createButton({
      x: center.x + 175, y: center.y, width: 50, height: 50,
      text: '>', onClick: () => {
        this.playSound('click')
        changeChar(1)
      }
    })

    scene.addChild(nextCharBtn)

    this.app.stage.addChild(scene)
  }

  setupInGameScene() {
    const center = this.screenCenter
    const TOP = 0
    const BOTTOM = this.app.screen.height
    const LEFT = 0
    const RIGHT = this.app.screen.width

    let playing = true

    this.currentScore = 0

    let playerVel = 0
    const gravity = 0.3
    const playerVelMax = 15

    const obstGap = 100
    const obstSpeed = 5
    const obstSpawnInterval = 100

    const obstacles = []

    this.bg.filters = [];

    const scene = new PIXI.Container()
    scene.sortableChildren = true

    const player = new PIXI.Sprite(this.loader.resources['bat_' + this.currentBat].texture)
    player.anchor.set(0.5)
    player.scale.set(0.25)
    player.x = 100
    player.y = center.y
    scene.addChild(player)

    const scoreText = new PIXI.Text('score: ' + this.currentScore, {
      ...textStyle,
      fill: ['#ffffff'],
    })
    scoreText.x = 10
    scoreText.y = 10
    scoreText.zIndex = 10
    scene.addChild(scoreText)

    const spawnObst = () => {
      const rand = (Math.random() - 0.5) * 2
      const type = Math.random() < 0.5 ? 0 : 1;

      const cont = new PIXI.Container()
      cont.x = RIGHT + 100

      const obstTop = new PIXI.Sprite(this.loader.resources['obstacle_top_' + type].texture)
      obstTop.anchor.set(0.5, 0)
      obstTop.scale.set(0.5)
      obstTop.y = TOP - obstGap + 100 * rand
      cont.addChild(obstTop)

      const obstBot = new PIXI.Sprite(this.loader.resources['obstacle_bottom_' + type].texture)
      obstBot.anchor.set(0.5, 1)
      obstBot.scale.set(0.5)
      obstBot.y = BOTTOM + obstGap + 100 * rand
      cont.addChild(obstBot)

      const passTrigger = new PIXI.Sprite(PIXI.Texture.EMPTY)
      passTrigger.width = 50
      passTrigger.height = this.app.screen.height
      passTrigger.x = obstBot.width / 2
      cont.addChild(passTrigger)

      scene.addChild(cont)

      obstacles.push(cont)
    }

    const incScore = () => {
      this.currentScore++
      scoreText.text = 'score: ' + this.currentScore
    }

    let elapsed = 0
    let obstLastSpawned = -Infinity

    const tick = (delta) => {
      elapsed += delta

      playerVel += gravity * delta
      if (playerVel > playerVelMax) playerVel = playerVelMax
      if (playerVel < -playerVelMax) playerVel = -playerVelMax

      player.y += playerVel * delta

      if (player.y < 50) {
        player.y = 50
        playerVel = 0
      }
      if (player.y > this.app.screen.height - 50) {
        player.y = this.app.screen.height - 50
        playerVel = 0
      }

      player.angle = playerVel

      this.bg.y = center.y + (player.y - center.y) / center.y * -48

      for (const obst of obstacles) {
        obst.x -= obstSpeed * delta
      }

      if (obstacles.length && obstacles[0].x < -100) {
        obstacles.shift().destroy({ children: true })
      }

      if (obstLastSpawned + obstSpawnInterval < elapsed) {
        spawnObst()
        obstLastSpawned = elapsed
      }

      if (obstacles.length) {
        const obst = obstacles[0]
        if (intersects(player, obst.children[0]) || intersects(player, obst.children[1])) {
          playing = false
          this.ticker.remove(tick)

          this.playSound('hit')

          if (this.currentScore > this.highScore) {
            this.highScore = this.currentScore
            localStorage.setItem('highScore', this.highScore)
          }

          const newGameBtn = createButton({
            x: center.x, y: center.y, width: 250, height: 50,
            text: 'To main screen', onClick: () => {
              this.playSound('click')
              scene.destroy({ children: true })
              this.setupNewGameScene()
            }
          })
      
          scene.addChild(newGameBtn)

        } else if (obst.children.length > 2 && intersects(player, obst.children[2])) {
          incScore()
          obst.children[2].destroy({ children: true })
        }
      }
    }

    const controlArea = new PIXI.Container()
    controlArea.hitArea = new PIXI.Rectangle(0, 0, this.app.screen.width, this.app.screen.height)
    controlArea.interactive = controlArea.buttonMode = true
    controlArea.on('pointerdown', () => {
      if (playing) this.playSound('wing')
      if (playerVel > 0) playerVel = 0
      playerVel -= 6
    })
    scene.addChild(controlArea)

    this.ticker.add(tick)

    this.app.stage.addChild(scene)
  }

  get screenCenter() {
    return { x: this.app.screen.width / 2, y: this.app.screen.height / 2 }
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const font = new FontFaceObserver('PixelSplitter', {})
  try {
    await font.load()
  } catch {}
  const app = new App(document.querySelector('#app'))
})
