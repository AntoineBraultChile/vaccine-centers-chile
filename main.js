const puppeteer = require("puppeteer");
const fs = require("fs");
// const ObjectsToCsv = require("objects-to-csv");

const url = "https://www.minsal.cl/vacunatorios-covid-19-region-metropolitana/";

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // got to url
  await page.goto(url, { waitUtil: "networkidle2" });

  // wait load list vaccine centers
  await page.waitForSelector("iframe[title='Vacunatorios COVID-19']", { visible: true });

  // content of iframe where there is the list of vaccine centers
  await page.$eval("iframe[title='Vacunatorios COVID-19']", (a) => a.scrollIntoView());
  let elementHandle = await page.$("iframe[title='Vacunatorios COVID-19']");
  let frame = await elementHandle.contentFrame();

  // select table
  await frame.waitForSelector("table", { visible: true });
  const table = await frame.$$eval("tbody > tr > td > span", (spans) => spans.map((span) => span.innerText));

  const lineLength = 9;
  const lineNumber = table.length / lineLength;

  // console.log(table.slice(0, 9));
  // console.log(table.slice(9 * 1, 2 * 9));
  // console.log(table.slice(9 * 2, 3 * 9));

  let vaccineCenters = [];
  comuna = table[0];
  for (let linePosition = 1; linePosition < lineNumber; linePosition++) {
    let line = table.slice(linePosition * lineLength, (linePosition + 1) * lineLength);
    let boost = line[4] == "Dosis de refuerzo" ? 1 : 0;
    let pfizer = line[5] == "Pfizer" ? 1 : 0;
    let coronavac = line[6] == "CoronaVac" ? 1 : 0;
    let astrazeneca = line[7] == "AstraZeneca" ? 1 : 0;

    // formating time
    let time = line[3];

    time = time.replace(/\s+a\s*/g, "-");
    time = time.replace(/lunes|Lun|L/g, "monday");
    time = time.replace(/Mar/g, "tuesday ");
    time = time.replace(/Mie|miercoles\s/g, "wednesday ");
    time = time.replace(/jueves|Juev?|J:?/g, "thursday ");
    time = time.replace(/V:?\s|Vie\s|viernes\s/g, "friday ");
    time = time.replace(/S\s|Sab\s|sabado\s/g, "saturday ");
    time = time.match(/^\d{1,2}/g) ? "monday-friday " + time : time;
    time = time.replace(/(\d{2})\s([A-Z,a-z]{2,})/g, "$1/$2");
    time = time.split("hrs. ").join("/").split("hrs ").join("/").split("/");
    time = time.map((i) => i.replace(/\s?hrs.?/, ""));
    time = time.map((i) => i.replace(/^\s/, ""));
    time = time.map((i) => i.replace(/(\s+y\s+)(de)?/, ","));
    time = time.filter((i) => i != "");
    time = time.map((i) => i.replace(" - ", "-"));
    time = time.map((i) => i.replace(", ", ","));
    // console.log(time[0].match(/(\d{1,2}:\d{2}\s*a+\s*\d{1,2}:\d{2})/));

    if (line[0] != "") {
      comuna = line[0];
    }
    let center = { comuna: comuna, name: line[1], address: line[2], time: time, boost: boost, pfizer: pfizer, coronavac: coronavac, astrazeneca: astrazeneca };
    vaccineCenters.push(center);
  }
  // console.log(vaccineCenters);
  let data = JSON.stringify({ vaccineCenters });
  fs.writeFileSync("output/vaccine-centers-metropolitana.json", data);

  await browser.close();
})();
