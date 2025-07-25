import "non.geist";
import "non.geist/mono";

import "./style.css";

import Alpine from "alpinejs";
import * as Tone from "tone";

import MusicalDate from "./musical-date";

const transport = Tone.getTransport();
transport.bpm.value = 100;

Alpine.store("app", {
  date: null,
  notes: [],
  master: null,
  init() {
    this.date = new MusicalDate();
    this.notes = this.date.asNotes();
    document.title = this.date.asString();
  },

  get masterRef() {
    return Alpine.$data(document.getElementById(this.master));
  },
});

Alpine.data("instrument", (notes, index) => {
  let synth = null;
  let loop = null;
  let drawer = Tone.getDraw();

  return {
    index: index,
    notes: notes,
    tempo: "8n",
    tempos: [],
    isPlaying: false,
    isMaster: false,
    isSynced: false,
    isOff: false,

    async init() {
      if (this.index === 1) {
        this.becomeMaster();
      } else {
        this.becomeOff();
      }

      this.initTempos();

      synth = new Tone.Synth({
        oscillator: {
          type: "sine",
        },
        // envelope: {
        //   attack: 2,
        //   decay: 0,
        //   sustain: 0,
        //   release: 0.01,
        // },
      }).toDestination();

      const filter = new Tone.Filter(2000, "lowpass", -48);
      filter.Q.value = 15; // max 50
      synth.connect(filter);
      filter.toDestination();

      const oscillatorValues = await synth.oscillator.asArray(600);
      const visualizer = new WaveformVisualizer(
        this.$root.querySelector("canvas"),
        oscillatorValues
      );

      visualizer.draw(visualizer.values);
      this.initLoop();

      this.$watch("tempo", (value) => {
        loop.interval = value;

        if (this.isMaster) {
          this.updateSyncedInstruments();
        }
      });

      this.$watch("isMaster", (value, oldValue) => {
        if (value !== oldValue) {
          if (!value && !this.isSynced && !this.isOff) {
            this.becomeOff();
          }
        }
      });
    },

    get isMaster() {
      return `instrument-${this.index}` === this.$store.app.master;
    },

    becomeMaster() {
      this.isOff = false;
      this.isSynced = false;
      this.$store.app.master = `instrument-${this.index}`;
      this.updateSyncedInstruments();
    },

    becomeSynced() {
      if (this.isMaster) {
        this.$store.app.master = null;
      }

      this.isOff = false;
      this.isSynced = true;

      if (this.$store.app.master) {
        this.tempo = this.$store.app.masterRef.tempo;
      }
    },

    becomeOff() {
      if (this.isMaster) {
        this.$store.app.master = null;
      }

      this.isOff = true;
      this.isSynced = false;
    },

    updateSyncedInstruments() {
      document.querySelectorAll("[id^='instrument-']").forEach((instrument) => {
        if (instrument.id !== this.id) {
          const otherInstrument = Alpine.$data(instrument);
          if (otherInstrument.isSynced) {
            otherInstrument.tempo = this.tempo;
          }
        }
      });
    },

    initTempos() {
      const max = 16;
      // for (let i = 0; i < max; i++) {
      //   this.tempos.push(`${i + 1}:${max}`);
      // }
      for (let i = 0; i < max; i++) {
        this.tempos.push(`${i + 1}n`);
      }
    },

    initLoop() {
      loop = new Tone.Pattern((time, note) => {
        synth.triggerAttackRelease(note, "16n", time);
        this.animateSequencer(time);
      }, this.notes);

      loop.interval = this.tempo;
      loop.start();
    },

    animateSequencer(time) {
      drawer.schedule(() => {
        const noteElement = this.$root.querySelector(`#note-${loop.index}`);
        noteElement.classList.add(
          "!text-white",
          "drop-shadow-[0_0px_4px_rgba(255,255,255,1.95)]"
        );

        setTimeout(() => {
          noteElement.classList.remove(
            "!text-white",
            "drop-shadow-[0_0px_4px_rgba(255,255,255,1.95)]"
          );
        }, 100);
      }, time);
    },

    setLoopInterval(interval) {
      this.loopInterval = interval;
      loop.interval = interval;
    },

    async play() {
      if (transport.state === "stopped" || transport.state === "paused") {
        transport.start();
      }
    },

    stop() {
      loop.stop();
    },

    toggle() {
      this.isPlaying = !this.isPlaying;
      if (this.isPlaying) {
        this.play();
      } else {
        this.stop();
      }
    },
  };
});

class WaveformVisualizer {
  constructor(canvasEl, values) {
    this.canvas = canvasEl;
    this.values = values;

    if (this.canvas) {
      console.log(`Found canvas element: ${this.canvas}`);
    } else {
      console.log("Canvas not found");
    }

    this.bgcolor = "white";
    this.color = "black";
    this.width = 32 * 2;
    this.height = 24 * 2;
    this.normalizeCurve = true;
    this.timeout = null;
  }

  scale(v, inMin, inMax, outMin, outMax) {
    return ((v - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  }

  draw(values) {
    if (this.canvas) {
      const context = this.canvas.getContext("2d");
      this.canvas.height = this.height;
      this.canvas.width = this.width;
      const width = this.canvas.width;
      const height = this.canvas.height;
      context.clearRect(0, 0, width, height);
      const maxValuesLength = 2048;
      if (values.length > maxValuesLength) {
        const resampled = new Float32Array(maxValuesLength);
        // down sample to maxValuesLength values
        for (let i = 0; i < maxValuesLength; i++) {
          resampled[i] =
            values[Math.floor((i / maxValuesLength) * values.length)];
        }
        values = resampled;
      }
      const max = this.normalizeCurve ? Math.max(0.001, ...values) * 1.1 : 1;
      const min = this.normalizeCurve ? Math.min(-0.001, ...values) * 1.1 : 0;

      const lineWidth = 3;
      context.lineWidth = lineWidth;
      context.beginPath();
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        const x = this.scale(i, 0, values.length, lineWidth, width - lineWidth);
        const y = this.scale(v, max, min, 0, height - lineWidth);
        if (i === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }
      context.lineCap = "round";
      context.strokeStyle = "white";
      context.stroke();
    }
  }
}

window.Alpine = Alpine;
Alpine.start();
