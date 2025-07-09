import "non.geist";
import "non.geist/mono";

import "./style.css";

import Alpine from "alpinejs";
import * as Tone from "tone";

Alpine.data("app", () => ({
  currentDate: "DDMMYYYY",
  notes: [],
  init() {
    this._now = new Date();
    this.currentDate = this.formatDate(this._now);
    this.notes = this.dateToNotes(this._now);
  },

  formatDate(date, asString = true) {
    const yyyy = date.getFullYear();
    let mm = date.getMonth() + 1; // Months start at 0!
    let dd = date.getDate();

    if (dd < 10) dd = "0" + dd;
    if (mm < 10) mm = "0" + mm;

    const dateString = `${dd}${mm}${yyyy}`;
    const dateArray = dateString.split("").map((char) => Number(char));

    if (asString) {
      return dateString;
    }

    return dateArray;
  },

  dateToNotes(date) {
    const dateArray = this.formatDate(date, false);
    const notes = [];

    const numberToNote = {
      0: "C4",
      1: "D4",
      2: "E4",
      3: "F4",
      4: "G4",
      5: "A4",
      6: "B4",
      7: "C5",
      8: "D5",
      9: "E5",
    };

    // Convert each digit in the date to its corresponding note
    dateArray.forEach((digit) => {
      if (numberToNote.hasOwnProperty(digit)) {
        notes.push(numberToNote[digit]);
      }
    });

    return notes;
  },
}));

Alpine.data("instrument", (notes) => {
  return {
    transport: null,
    synth: null,
    loop: null,
    notes: notes,
    isPlaying: false,

    init() {},

    play() {
      this.transport = Tone.getTransport();

      this.synth = new Tone.Synth({
        oscillator: {
          type: "sine",
          modulationType: "square",
        },
      }).toDestination();

      let noteIndex = 0;
      this.loop = new Tone.Pattern((time, note) => {
        Alpine.raw(this.synth).triggerAttackRelease(note, "16n", time);

        Tone.Draw.schedule(() => {
          this.$root.querySelectorAll(".note-element").forEach((el) => {
            el.classList.remove("active");
          });

          const noteElement = this.$root.querySelector(`#note-${noteIndex}`);
          if (noteElement) {
            noteElement.classList.add("text-red-500");
          }

          setTimeout(() => {
            if (noteElement) {
              noteElement.classList.remove("text-red-500");
            }
          }, 100);

          noteIndex = (noteIndex + 1) % this.notes.length;
        }, time);
      }, this.notes).start(0);

      this.loop.interval = "16n";

      this.transport.start();
    },

    stop() {
      this.transport.stop();
      this.synth.dispose();
      this.loop.stop();
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

window.Alpine = Alpine;
Alpine.start();
