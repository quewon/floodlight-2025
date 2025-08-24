const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

var _sfx = {
    "ringtone": "ring.mp3",
    "narration": "narration/1.mp3",
    "narration_low": "narration/low.mp3",
    "j": [
        "j/1.mp3",
        "j/2.mp3",
        "j/3.mp3",
    ],
    "j_low": "j/low.mp3"
}

for (let sound in _sfx) {
    if (Array.isArray(_sfx[sound])) {
        let a = [];
        for (let s of _sfx[sound]) {
            let audio = new Audio();
            audio.src = "res/sounds/" + s;
            a.push(audio);
        }
        _sfx[sound] = a;
    } else {
        let audio = new Audio();
        audio.src = "res/sounds/" + _sfx[sound];
        _sfx[sound] = audio;
    }
}

function sfx(name, onend) {
    let sound;
    if (Array.isArray(_sfx[name])) {
        let a = _sfx[name];
        sound = a[Math.random() * a.length | 0];
    } else {
        sound = _sfx[name];
    }
    sound.currentTime = 0;
    sound.play();
    sound.onended = onend;
}