export default class MusicalDate {
  constructor(date = new Date()) {
    this.date = date;
  }

  asString() {
    const yyyy = this.date.getFullYear();
    let mm = this.date.getMonth() + 1; // Months start at 0!
    let dd = this.date.getDate();

    if (dd < 10) dd = "0" + dd;
    if (mm < 10) mm = "0" + mm;

    return `${dd}${mm}${yyyy}`;
  }

  asArray() {
    return this.asString()
      .split("")
      .map((char) => Number(char));
  }

  asNotes() {
    const notes = [];

    const numberToNote = {
      0: "B3",
      1: "C4",
      2: "D4",
      3: "E4",
      4: "F4",
      5: "G4",
      6: "A4",
      7: "B4",
      8: "C5",
      9: "D5",
    };

    this.asArray().forEach((digit) => {
      if (numberToNote.hasOwnProperty(digit)) {
        notes.push(numberToNote[digit]);
      }
    });

    return notes;
  }
}
