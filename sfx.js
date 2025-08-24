const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();

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

loadAudio();
async function loadAudio() {
    for (let name in _sfx) {
        if (Array.isArray(_sfx[name])) {
            let a = [];
            for (let path of _sfx[name]) {
                let buffer = await fetch("res/sounds/" + path)
                .then(res => res.arrayBuffer())
                .then(buffer => audioContext.decodeAudioData(buffer))
                a.push(buffer);
            }
            _sfx[name] = a;
        } else {
            let path = _sfx[name];
            let buffer = await fetch("res/sounds/" + path)
            .then(res => res.arrayBuffer())
            .then(buffer => audioContext.decodeAudioData(buffer))
            _sfx[name] = buffer;
        }
    }
}

function sfx(name) {
    let buffer;
    if (Array.isArray(_sfx[name])) {
        let a = _sfx[name];
        buffer = a[Math.random() * a.length | 0];
    } else {
        buffer = _sfx[name];
    }
    if (typeof buffer === "string") return;
    let source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
}