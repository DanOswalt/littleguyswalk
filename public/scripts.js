class LittleGuy {
  constructor(opts){

    // these define the firestore doc
    this.userId = opts.userId || null;
    this.isMoving = false;
    this.currentDirection = opts.currentDirection || 0; 
    this.x = opts.x || 0;
    this.y = opts.y || 0;

    // these are only updated on the client's machine
    this.sequence = [0, 1, 0, 2];
    this.currentSequenceIndex = 0;
    this.imgSrc = opts.imgSrc || 'https://opengameart.org/sites/default/files/Green-Cap-Character-16x18.png';
    this.animationId = null;
  }
}

class CanvasCtrl {
  constructor() {
    this.localUser = null;
    this.imgs = {};
    this.guys = [];
    this.canvas = document.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = 16;
    this.height = 18;
    this.frameCount = 0;
    this.keysDown = [];
    this.directions = {
      DOWN: 0,
      UP: 1,
      LEFT: 2,
      RIGHT: 3
    };
  }

  // on open, get all guys from db
  getAllGuys() {
    const self = this;
    const guys = {};

    db.collection("guys").get().then(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
          const guy = new LittleGuy(doc.data());
          self.createNewSprite(guy);
          guys[guy.userId] = guy;
      });
      self.guys = guys;
    });

    self.initListeners();
  }

  // listen for changes
  initListeners() {
    const self = this;
    const guys = {};

    db.collection("guys").onSnapshot(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
        console.log('update reflected')
        const guy = new LittleGuy(doc.data());
        guys[guy.userId] = guy;
      });
      self.guys = guys;
    })
  }


  update(guy) {
    const { userId, currentDirection, isMoving, x, y} = guy;
    const updateObject = {
      currentDirection,
      isMoving,
      x,
      y
    }
    db.collection('guys').doc(userId).update(updateObject)
      .then(() => {
        console.log('updated')
      }).catch(err => console.log(err))
  }

  createNewSprite(guy) {
    const self = this;
    let img = new Image();
    img.src = guy.imgSrc;
    self.imgs[guy.userId] = img;
  
    img.onload = function() {
      self.init(guy);
    };
  }

  step(guy) {
    const self = this;
    const localUser = self.guys[self.localUser]

    // update frame
    self.frameCount++;
  
    // throttle animation so it doesn't moveUserGuy every frame
    // this would be about 2 cycles per second (2 steps)
  
    if (self.frameCount < 8) {
      window.requestAnimationFrame(() => { self.step(guy) });
      return;
    }
    self.frameCount = 0;
  
    // move to next frame of sequence
    guy.currentSequenceIndex++;
    if (guy.currentSequenceIndex >= 4) {
      guy.currentSequenceIndex = 0;
    }
  
    // render the next frame of the image
    self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
    // for each guy

    for (let id in self.guys) {
      const guy = self.guys[id];
      self.drawFrame(self.imgs[guy.userId], 
                     guy.sequence[guy.currentSequenceIndex], 
                     guy.currentDirection, 
                     guy.x, 
                     guy.y);
    }

    if (localUser.isMoving) {
      if (localUser.currentDirection === self.directions.LEFT) {  
        localUser.x -= 4;
      } else if (localUser.currentDirection === self.directions.UP) { 
        localUser.y -= 4;
      } else if (localUser.currentDirection === self.directions.RIGHT) { 
        localUser.x += 4;
      } else if (localUser.currentDirection === self.directions.DOWN) { 
        localUser.y += 4;
      }
      self.update(guy);
      window.requestAnimationFrame(() => { self.step(localUser) });
    }
  }
  
  drawFrame(img, frameX, frameY, canvasX, canvasY) {
    this.ctx.drawImage(img,
                  frameX * this.width, frameY * this.height, this.width, this.height,
                  canvasX, canvasY, this.width, this.height);
  }
  
  moveUserGuy(guy) {
    const self = this;
    guy.isMoving = true;

    if (guy.currentDirection === self.directions.LEFT) {  
      guy.x -= 4;
    } else if (guy.currentDirection === self.directions.UP) { 
      guy.y -= 4;
    } else if (guy.currentDirection === self.directions.RIGHT) { 
      guy.x += 4;
    } else if (guy.currentDirection === self.directions.DOWN) { 
      guy.y += 4;
    }

    // send update to db
    self.update(guy);
    guy.animationId = window.requestAnimationFrame(() => { self.step(guy) });
    console.log('start:', guy.animationId);
  }
  
  haltUserGuy(guy) {
    guy.isMoving = false;
    guy.currentSequenceIndex = 1; //standing position
    this.update(guy);
    console.log('cancel:', guy.animationId);
    window.cancelAnimationFrame(guy.animationId);
  }
  
  init(guy) {
    this.update(guy);
    this.drawFrame(this.imgs[guy.userId], guy.sequence[guy.currentSequenceIndex], guy.currentDirection, guy.x, guy.y);
  }
}

firebase.auth().onAuthStateChanged(function(user) {
  const self = this;
  if (user) {
    const uid = user.uid;
    const guy = new LittleGuy({ userId: uid });

    db.collection('guys').doc(uid).set({
      userId: guy.userId,
      isMoving: guy.isMoving,
      currentDirection: guy.currentDirection,
      x: guy.x,
      y: guy.y    
    }).then(function() {
      console.log("Document successfully written!");
      window.Canvas = new CanvasCtrl();
      Canvas.guys.push(guy);
      Canvas.localUser = guy.userId;
      Canvas.createNewSprite(guy);
      Canvas.getAllGuys();
    })
    .catch(function(error) {
        console.error("Error writing document: ", error);
    });
  } 
});


document.addEventListener('keydown', (e) => {
  e.preventDefault();
  const key = e.keyCode;
  const userGuy = Canvas.guys[Canvas.localUser];

  Canvas.keysDown[key] = true;

  if (userGuy.isMoving || !(key >= 37 && key <= 40)) return;  

  if (Canvas.keysDown[37]) { 
    userGuy.currentDirection = Canvas.directions.LEFT; 
  } else if (Canvas.keysDown[38]) { 
    userGuy.currentDirection = Canvas.directions.UP;
  } else if (Canvas.keysDown[39]) { 
    userGuy.currentDirection = Canvas.directions.RIGHT;
  } else if (Canvas.keysDown[40]) { 
    userGuy.currentDirection = Canvas.directions.DOWN;
  }

  Canvas.moveUserGuy(userGuy);
})
  
document.addEventListener('keyup', (e) => {
  const key = e.keyCode;
  const userGuy = Canvas.guys[Canvas.localUser];

  Canvas.keysDown[key] = false;

  if (!(key >= 37 && key <= 40)) {
    return;
  }

  if (Canvas.keysDown[37] || 
      Canvas.keysDown[38] || 
      Canvas.keysDown[39] || 
      Canvas.keysDown[40]) return;

  Canvas.haltUserGuy(userGuy);
})