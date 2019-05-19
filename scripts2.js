class GreenSprite {
  constructor(opts){

    // these define the firestore doc
    this.userId = opts.userId || null;
    this.isMoving = false;
    this.direction = opts.currentDirection || 0; 
    this.x = opts.x || 0;
    this.y = opts.y || 0;

    // these are only updated on the client's machine
    this.width = opts.width || 16;
    this.height = opts.height || 18;
    this.sequence = [0, 1, 0, 2];
    this.currentSequenceIndex = 1;
    this.imgSrc = opts.imgSrc || 'https://opengameart.org/sites/default/files/Green-Cap-Character-16x18.png';
  }
}