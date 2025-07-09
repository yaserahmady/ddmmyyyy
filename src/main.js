import "non.geist";
import "non.geist/mono";

import "./style.css";

import Alpine from "alpinejs";
import * as Tone from "tone";

const transport = Tone.getTransport();

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
  let synth = null;
  let loop = null;
  let drawer = null;

  return {
    notes: notes,
    isPlaying: false,

    init() {},

    play() {
      if (transport.state === "stopped" || transport.state === "paused") {
        transport.start();
      }

      const reverb = new Tone.Reverb().toDestination();

      synth = new Tone.Synth({
        oscillator: {
          type: "sine",
          modulationType: "square",
        },
      })
        .connect(reverb)
        .toDestination();

      let noteIndex = 0;
      loop = new Tone.Pattern((time, note) => {
        synth.triggerAttackRelease(note, "16n", time);

        drawer = Tone.getDraw();
        drawer.schedule(() => {
          this.$root.querySelectorAll(".note-element").forEach((el) => {
            el.classList.remove("active");
          });

          const noteElement = this.$root.querySelector(`#note-${noteIndex}`);
          if (noteElement) {
            noteElement.classList.add(
              "!text-white",
              "drop-shadow-[0_0px_4px_rgba(255,255,255,1.95)]"
            );
          }

          setTimeout(() => {
            if (noteElement) {
              noteElement.classList.remove(
                "!text-white",
                "drop-shadow-[0_0px_4px_rgba(255,255,255,1.95)]"
              );
            }
          }, 100);

          noteIndex = (noteIndex + 1) % this.notes.length;
        }, time);
      }, this.notes);

      loop.interval = "16n";

      loop.start(0);
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

window.Alpine = Alpine;
Alpine.start();
