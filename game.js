const DEFAULT_FONT = "italic 26px 'Times', serif";
const CELL_SIZE = 100;
const SUITCASE_SIZE = [10, 5];

var mapLocked = false;

class Room {
    screenPosition = 0;
    vsp = 0;

    constructor(o) {
        this.width = o.width || 1;
        this.objects = o.objects || [];
        this.background = new Image();
        new Promise(resolve => {
            this.background.addEventListener("load", () => {
                resolve();
            })
            this.background.src = "res/" + o.background;
        })
        .then(() => {
            this.loaded = true;
        })
    }

    draw() {
        context.drawImage(this.background, -this.vsp * canvas.width, 0, canvas.width * this.width, canvas.height);
        if (this.vsp == this.screenPosition) {
            for (let object of this.objects)
                object.draw();
        }
        for (let object of this.objects)
            object.drawUI();

        if (!mapLocked && this.width > 1) {
            context.fillStyle = "rgba(255, 255, 255, .5)";
            if (this.screenPosition < this.width - 1) {
                if (mouse[0] >= canvas.width - canvas.width/4)
                    context.fillRect(canvas.width - canvas.width/4, 0, canvas.width/4, canvas.height);
            }
            if (this.screenPosition > 0) {
                if (mouse[0] <= canvas.width/4)
                    context.fillRect(0, 0, canvas.width/4, canvas.height);
            }
        }
    }

    update(dt) {
        for (let object of this.objects)
            object.update(dt);

        if (!mapLocked && this.width > 1 && mouseclicked) {
            if (this.screenPosition < this.width - 1) {
                if (mouse[0] >= canvas.width - canvas.width/4) {
                    this.screenPosition++;
                    for (let object of this.objects)
                        object.position[0] -= canvas.width;
                }
            }
            if (this.screenPosition > 0) {
                if (mouse[0] <= canvas.width/4) {
                    this.screenPosition--;
                    for (let object of this.objects)
                        object.position[0] += canvas.width;
                }
            }
        }

        if (this.vsp !== this.screenPosition) {
            let d = Math.sign(this.screenPosition - this.vsp);
            this.vsp += d * dt/1000;
            if (Math.sign(this.screenPosition - this.vsp) !== d)
                this.vsp = this.screenPosition;
        }
    }
}

class Object {
    loaded = false;
    held = false;
    heldv = 0;
    heldf = 0;
    helda = 1;
    shadowWidth = 1;
    imagedata;
    heldImagedata;
    dialogueIndex = 0;
    taken = false;
    actionLabel = "take";
    candrop = false;

    constructor(o) {
        this.size = o.size || [1, 1];
        this.name = o.name;
        this.position = o.position || [0, 0];
        this.dialogue = o.dialogue || [];
        
        this.image = new Image();
        this.heldImage = new Image();
        Promise.all([
            new Promise(resolve => {
                this.image.addEventListener("load", () => {
                    resolve();
                });
                this.image.src = "res/" + o.image;
            }),
            new Promise(resolve => {
                this.heldImage.addEventListener("load", () => {
                    resolve();
                });
                this.heldImage.src = o.heldImage ? "res/" + o.heldImage : "res/" + o.image;
            })
        ])
        .then(() => {
            let dc = debugcanvas.getContext("2d");

            debugcanvas.width = this.image.naturalWidth;
            debugcanvas.height = this.image.naturalHeight;
            dc.clearRect(0, 0, debugcanvas.width, debugcanvas.height);
            dc.drawImage(this.image, 0, 0);
            this.imagedata = dc.getImageData(0, 0, debugcanvas.width, debugcanvas.height).data;

            debugcanvas.width = this.heldImage.naturalWidth;
            debugcanvas.height = this.heldImage.naturalHeight;
            dc.clearRect(0, 0, debugcanvas.width, debugcanvas.height);
            dc.drawImage(this.heldImage, 0, 0);
            this.heldImagedata = dc.getImageData(0, 0, debugcanvas.width, debugcanvas.height).data;

            this.loaded = true;
        })
    }

    drawOutline(image, px, py, color) {
        context.shadowColor = color || "white";
        context.shadowBlur = 1;
        for (let x=-2; x<=2; x++){
            for (let y=-2; y<=2; y++) {
                context.shadowOffsetX = x * this.shadowWidth;
                context.shadowOffsetY = y * this.shadowWidth;
                context.drawImage(image, px, py);
            }
        }
        context.shadowColor = "transparent";
    }

    draw() {
        if (!this.loaded) return;
        if (!this.taken) {
            let hovered = this.hovered();
            context.globalAlpha = clamp(1 - this.heldf);
            if (hovered && this.heldf <= 0)
                this.drawOutline(this.image, this.position[0], this.position[1])
            context.drawImage(this.image, this.position[0], this.position[1]);
            // if (this.name && hovered && this.heldf <= 0) {
            //     context.font = DEFAULT_FONT;
            //     let mm = context.measureText(this.name);
            //     let height = mm.fontBoundingBoxAscent + mm.fontBoundingBoxDescent;
            //     let p = 10;
            //     let x = this.position[0] + this.image.naturalWidth/2 - mm.width/2;
            //     let y = this.position[1] + this.image.naturalHeight/2 - height/2;
            //     context.fillStyle = "white";
            //     context.fillRect(x, y, mm.width + p*2, height + p*2);
            //     context.fillStyle = "black";
            //     context.fillText(this.name, x + p, y + p);
            // }
            context.globalAlpha = 1;
        }
    }

    drawUI() {
        let width = this.heldImage.naturalWidth;
        let height = this.heldImage.naturalHeight;
        let x = canvas.width/2 - width/2;
        let y = lerp(canvas.height, canvas.height/2 - height/2, this.heldf);

        context.globalAlpha = Math.min(this.heldf/1.5, smoothstep(this.helda));
        let gradient = context.createRadialGradient(
            canvas.width/2, canvas.height/2, Math.min(width, height)/2 * this.helda,
            canvas.width/2, canvas.height/2, canvas.height
        );
        gradient.addColorStop(0, "white");
        gradient.addColorStop(1, "black");
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalAlpha = 1;
        
        if (this.hoveredHeld())
            this.drawOutline(this.heldImage, x, y, "cyan");

        if (!this.taken)
            context.drawImage(this.heldImage, x, y);

        if (this.held && (!dialogueBuffer || !dialogueBuffer.playing)) {
            let text;
            let color;
            if (this.hoveredHeld()) {
                text = this.actionLabel;
                color = "cyan";
            } else {
                text = "drop";
                color = "white";
            }
            context.font = DEFAULT_FONT;
            let mm = context.measureText(text);
            let h = mm.fontBoundingBoxAscent + mm.fontBoundingBoxDescent;
            let p = 10;
            context.fillStyle = color;
            context.strokeStyle = "black";
            context.fillRect(x + width/2 - mm.width/2 - p, y + height + 5, mm.width + p*2, h + p*2);
            context.fillStyle = "black";
            context.fillText(text, x + width/2 - mm.width/2, y + height + 5 + p);
        }
    }

    hoveredHeld() {
        if (!this.held || (dialogueBuffer && dialogueBuffer.playing))
            return false;

        let width = this.heldImage.naturalWidth;
        let height = this.heldImage.naturalHeight;
        let x = canvas.width/2 - width/2;
        let y = lerp(canvas.height, canvas.height/2 - height/2, this.heldf);
        if (
            mouse[0] >= x && mouse[0] <= x + width &&
            mouse[1] >= y && mouse[1] <= y + height &&
            this.heldImagedata[Math.floor(mouse[1] - y) * (width * 4) + Math.floor(mouse[0] - x) * 4 + 3]
        ) {
            return true;
        }
        return false;
    }

    hovered() {
        if (this.taken) return false;
        
        let width = this.image.naturalWidth;
        let height = this.image.naturalHeight;

        if (
            !this.held &&
            mouse[0] >= this.position[0] && mouse[0] <= this.position[0] + width &&
            mouse[1] >= this.position[1] && mouse[1] <= this.position[1] + height &&
            this.imagedata[Math.floor(mouse[1] - this.position[1]) * (width * 4) + Math.floor(mouse[0] - this.position[0]) * 4 + 3]
        ) {
            return true;
        }
        return false;
    }

    hold() {
        this.held = true;
        mapLocked = true;
        if (this.dialogue[this.dialogueIndex]) {
            dialogueBuffer = this.dialogue[this.dialogueIndex];
            dialogueBuffer.play();
        }
    }

    drop() {
        this.held = false;
        mapLocked = false;
        this.dialogueIndex++;
        if (this.dialogueIndex >= this.dialogue.length)
            this.dialogueIndex = this.dialogue.length - 1;
        mouseclicked = false;
    }

    onclick() {
        if (mouseclicked) {
            if (this.held) {
                if (this.hoveredHeld()) {
                    this.action();
                } else if (!dialogueBuffer || !dialogueBuffer.playing) {
                    this.drop();
                }
            } else if (this.hovered()) {
                this.hold();
            }
        }
    }

    update(dt) {
        if (!this.loaded) return;

        if (mouseclicked) {
            this.onclick();
        }

        if (!this.taken) {
            if (this.held) {
                this.heldv += dt/5000 * (1 - this.heldf);
                this.heldv /= 1.4;
            } else {
                this.heldv = -1 * dt/4000;
            }
            this.heldf += this.heldv * dt;
            if (this.heldf < 0) this.heldf = 0;
        } else {
            this.helda -= dt/300;
            if (this.helda < 0) this.helda = 0;
        }
    }

    action() {
        this.taken = true;
        inventory.push(this);
        this.inventoryPosition = [
            Math.random() * canvas.width/2 + canvas.width/4 - this.size[0]/2 * CELL_SIZE,
            Math.random() * canvas.height/2 + canvas.height/4 - this.size[1]/2 * CELL_SIZE
        ];
        this.drop();
    }
}

class Door extends Object {
    constructor(o) {
        super(o);
        this.link = o.link;
    }

    draw() {
        if (!this.loaded) return;
        if (this.hovered()) {
            this.drawOutline(this.image, this.position[0], this.position[1]);
            context.fillStyle = "gray";
            context.fillRect(this.position[0], this.position[1], this.image.naturalWidth, this.image.naturalHeight);
            context.drawImage(this.image, 0, 0, 20, this.image.naturalHeight, this.position[0], this.position[1], 20, this.image.naturalHeight);
        } else {
            context.drawImage(this.image, this.position[0], this.position[1]);
        }
    }
    
    update() {
        if (!this.loaded) return;
        if (this.hovered() && mouseclicked) {
            room = rooms[this.link];
        }
    }
}

class Suitcase extends Object {
    actionLabel = "open";
    open = false;

    constructor(o) {
        super(o);
    }

    drawUI() {
        super.drawUI();
        if (this.open)
            this.drawSuitcase();
    }

    onclick() {
        if (mouseclicked) {
            if (this.held) {
                if (this.hoveredHeld()) {
                    this.action();
                } else if (!this.open && (!dialogueBuffer || !dialogueBuffer.playing)) {
                    this.drop();
                }
            } else if (this.hovered()) {
                this.hold();
            }
        }
    }

    drawInventoryObject(object) {
        var c = CELL_SIZE;
        let p = object.inventoryPosition;
        context.strokeStyle = "white";
        context.beginPath();
        for (let x=0; x<object.size[0]; x++) {
            for (let y=0; y<object.size[1]; y++) {
                context.rect(p[0] + x * c, p[1] + y * c, c, c);
            }
        }
        context.stroke();
        context.drawImage(object.image, p[0], p[1]);
    }

    rotateInventoryObject(object) {
        object.size = [
            object.size[1],
            object.size[0]
        ];
        object.rotation++;
        if (object.rotation > 3) object.rotation = 0;
    }

    hoveredInventoryObject() {
        var c = CELL_SIZE;
        for (let object of inventory) {
            let p = object.inventoryPosition;
            if (
                mouse[0] >= p[0] && mouse[0] <= p[0] + object.size[0] * c &&
                mouse[1] >= p[1] && mouse[1] <= p[1] + object.size[1] * c
            ) {
                return object;
            }
        }
        return null;
    }

    update(dt) {
        if (!this.open) {
            super.update(dt);
            return;
        }

        if (mouseclicked && !this.grabbedInventoryObject && !this.hoveredOnSuitcase()) {
            this.open = false;
            this.drop();
        }
        
        let ho = this.hoveredInventoryObject();
        if (!this.grabbedInventoryObject && ho && mousedown) {
            this.grabbedInventoryObject = ho;
            let p = ho.inventoryPosition;
            this.grabOffset = [p[0] - mouse[0], p[1] - mouse[1]];
        }

        if (ho && mouserightclicked) {
            this.rotateInventoryObject(ho);
        }

        if (this.grabbedInventoryObject) {
            if (mousedown) {
                let g = this.grabbedInventoryObject;
                
                g.inventoryPosition = [
                    mouse[0] + this.grabOffset[0],
                    mouse[1] + this.grabOffset[1]
                ]
            } else {
                this.grabbedInventoryObject = null;
            }
        }
    }

    hoveredOnSuitcase() {
        let sw = SUITCASE_SIZE[0] * CELL_SIZE;
        let sh = SUITCASE_SIZE[1] * CELL_SIZE;
        let sx = canvas.width/2 - sw/2;
        let sy = canvas.height/2 - sh/2;
        if (
            mouse[0] >= sx && mouse[0] <= sx + sw &&
            mouse[1] >= sy && mouse[1] <= sy + sh
        ) {
            return true;
        }
        return false;
    }

    drawSuitcase() {
        let c = CELL_SIZE;
        let sw = SUITCASE_SIZE[0] * CELL_SIZE;
        let sh = SUITCASE_SIZE[1] * CELL_SIZE;
        let sx = canvas.width/2 - sw/2;
        let sy = canvas.height/2 - sh/2;

        if (!this.grabbedInventoryObject && !this.hoveredOnSuitcase()) {
            context.font = DEFAULT_FONT;
            let mm = context.measureText("close");
            let height = mm.fontBoundingBoxAscent + mm.fontBoundingBoxDescent;
            let p = 10;
            context.fillStyle = "white";
            context.fillRect(canvas.width/2 - mm.width/2 - p, sy + sh + 5, mm.width + p*2, height + p*2);
            context.fillStyle = "black";
            context.fillText("close", canvas.width/2 - mm.width/2, sy + sh + 5 + p);
        }

        context.fillStyle = "black";
        context.strokeStyle = "white";
        context.beginPath();
        for (let x=0; x<SUITCASE_SIZE[0]; x++) {
            for (let y=0; y<SUITCASE_SIZE[1]; y++) {
                context.rect(sx + x * c, sy + y * c, c, c);
            }
        }
        context.fill();
        context.stroke();

        for (let object of inventory) {
            this.drawInventoryObject(object);
        }
    }

    action() {
        this.open = true;
    }
}

class Dialogue {
    lines = [];
    boxes = [];
    playing = false;
    lineIndex = 0;

    constructor(text) {
        this.parse(text);
        this.play();
    }

    parse(text) {
        let lines = text.trim().split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line === "") continue;

            let type = 0; // narration
            let split = line.split(':');
            if (line[1] === ':' && split.length > 1) {
                type = split[0].toUpperCase();
                line = split.slice(1).join('');
            } else {
                type = "narration";
            }
            this.lines.push({ line, type });
        }
    }

    play() {
        this.playing = true;
        this.boxes = [];
        this.lineIndex = 0;
        this.playLine();
    }

    playLine() {
        let data = this.lines[this.lineIndex];
        for (let i=0; i<this.boxes.length; i++) {
            if (this.boxes[i].closed) continue;
            if (this.boxes[i].type === data.type || this.lineIndex - i > 1) {
                this.boxes[i].close();
            }
        }
        this.boxes.push(new DialogueBox(data.line, data.type));
    }

    draw() {
        for (let box of this.boxes)
            box.draw();
    }

    update(dt) {
        if (this.boxes[this.lineIndex]?.awaitingInput && mouseclicked) {
            this.lineIndex++;
            if (this.lineIndex < this.lines.length) {
                this.playLine();
            } else {
                let i = 0;
                for (let box of this.boxes)
                    if (!box.closed)
                        setTimeout(box.close.bind(box), (i++)*50)
                this.playing = false;
            }
        }

        for (let box of this.boxes)
            box.update(dt);
    }
}

class DialogueBox {
    awaitingInput = false;
    closed = false;
    lines = [];
    lineIndex = 0;
    charIndex = 0;
    playf = 0;
    boxf = 0;
    boxa = 1;

    speed = 30;
    font = DEFAULT_FONT;
    color = "yellow";
    types = {
        "narration": { //narration
            width: 500,
            font: "26px 'Times', serif",
        },
        "A": { //auditor
            name: "you",
            font: "26px 'Times', serif",
            width: 300,
            color: "white"
        },
        "J": { //journalist
            name: "j",
            font: "23px 'Courier', monospace",
            width: 300,
            color: "white",
            speed: 1.5
        }
    }

    constructor(text, type) {
        this.type = type;
        context.font = this.types[this.type].font || this.font;
        this.lines = this.breakLinesToFit(text, this.types[type].width);
    }

    breakLinesToFit(line, width) {
        let lines = [];
        let i = 0;
        while (line.length >= i) {
            let sub = line.substring(i, line.length);
            let words = sub.split(/[^A-Za-z.?!'",]/).filter(w => w !== "");
            if (words.length === 0)
                break;
            let word = words[0];
            let length = word.length + sub.indexOf(word);
            if (context.measureText(line.substring(0, i + length)).width <= width) {
                i += length;
            } else {
                lines.push(line.substring(0, i).trim());
                line = line.substring(i, line.length);
                i = 0;
            }
        }
        if (line.trim() !== "")
            lines.push(line.trim());
        return lines;
    }

    close() {
        this.closed = true;
    }

    draw() {
        if (this.boxf === 0) return;

        context.globalAlpha = this.boxa;
        context.font = this.types[this.type].font || this.font;

        let width = this.types[this.type].width;
        let line = this.lines[this.lineIndex].slice(0, this.charIndex);

        let mm = context.measureText(line);
        if (this.lines.length == 1)
            width = Math.min(mm.width, width);
        let lineHeight = mm.fontBoundingBoxAscent + mm.fontBoundingBoxDescent;
        let height = this.lines.length * lineHeight * smootherstep(this.boxf);
        let p = 20;

        let x, y;
        if (this.type === "narration") {
            x = canvas.width/2 - width/2;
            y = canvas.height/2 - height/2;
        } else {
            if (this.type === "A") {
                x = canvas.width/3 - width/2;
                y = canvas.height - canvas.height/2.5 - height/2;
            } else {
                x = canvas.width - canvas.width/3 - width/2;
                y = canvas.height/2.5 - height/2;
            }
        }

        context.fillStyle = this.types[this.type].color || this.color;
        context.strokeStyle = "black";
        context.lineWidth = 2;
        context.beginPath();
        context.rect(x - p, y - p, width + p*2, height + (p * smootherstep(this.boxf))*2);
        context.fill();
        context.stroke();
        if (this.boxf === 1) {
            context.fillStyle = "black";
            for (let i=0; i<=this.lineIndex; i++) {
                if (i == this.lineIndex) {
                    context.fillText(line, x, y + i * lineHeight);
                } else {
                    context.fillText(this.lines[i], x, y + i * lineHeight);
                }
            }
        }
        
        if (this.type !== "narration") {
            let bw = 100;
            let margin = p/2;
            let bx;
            if (this.type === "A") {
                bx = x - p - margin - bw;
            } else {
                bx = x - p + width + p*2 + margin;
            }
            context.fillStyle = "white";
            context.strokeStyle = "black";
            context.beginPath();
            context.rect(bx, y - p, bw, bw);
            context.fill();
            context.stroke();
            context.fillStyle = "black";

            context.font = this.font;
            context.fillText(this.types[this.type].name, bx + p, y - p + p);
        }

        context.globalAlpha = 1;
    }

    update(dt) {
        if (!this.closed) {
            this.boxf += dt/150;
            if (this.boxf > 1) this.boxf = 1;

            if (!this.awaitingInput && this.boxf >= 1) {
                let duration;
                let word, length;
                let speed = (1 / (this.types[this.type].speed || 1)) * this.speed;
                if (this.type !== "narration") {
                    let line = this.lines[this.lineIndex];
                    let sub = line.substring(this.charIndex, line.length);
                    word = sub.split(/[^A-Za-z.?!'",]/).filter(w => w !== "")[0];
                    length = word.length + sub.indexOf(word);
                    let missedchars = sub.substring(0, sub.indexOf(word));
                    duration = (length + (missedchars.match(/—/) ? 10 : 0)) * speed;
                } else {
                    duration = speed;
                }
                this.playf += dt;
                if (this.playf >= duration) {
                    if (this.type !== "narration") {
                        this.playf = word.match(/[.?!,—]/) ? -300 : 0;
                        this.charIndex += length;
                    } else {
                        let char = this.lines[this.lineIndex][this.charIndex];
                        this.charIndex++;
                        this.playf = char.match(/[.?!,—]/) ? -200 : 0;
                    }
                    if (this.charIndex >= this.lines[this.lineIndex].length) {
                        this.charIndex = 0;
                        this.lineIndex++;
                        if (this.lineIndex >= this.lines.length) {
                            this.lineIndex = this.lines.length - 1;
                            this.charIndex = this.lines[this.lineIndex].length;
                            this.awaitingInput = true;
                        }
                    }
                }

                if (mouseclicked) {
                    this.awaitingInput = true;
                    this.lineIndex = this.lines.length - 1;
                    this.charIndex = this.lines[this.lineIndex].length;
                }
            }
        } else {
            this.boxa -= dt/150;
            if (this.boxa < 0) this.boxa = 0;
        }
    }
}