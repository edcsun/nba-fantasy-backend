const EventEmitter = require("events");
const fs = require("fs");

class JsonFileSaver extends EventEmitter {
  constructor(filePath) {
    super();
    this.filePath = filePath;
  }

  load(callback) {
    console.log(`file ${this.filePath} reading...`);
    fs.readFile(this.filePath, "utf8", (err, data) => {
      if (err) throw error;
      console.log(`file ${this.filePath} read`);
      const jsonData = JSON.parse(data);
      this.emit("loaded", jsonData);
      if (callback) callback(jsonData);
    });
  }

  save(data, callback) {
    console.log(`file ${this.filePath} writing...`);
    const stringData = JSON.stringify(data);
    fs.writeFile(this.filePath, stringData, err => {
      if (err) throw err;
      console.log(`file ${this.filePath} saved`);
      this.emit("saved", stringData);
      if (callback) callback(stringData);
    });
  }
}

module.exports = JsonFileSaver;
