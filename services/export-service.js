const xl = require("excel4node");

function ExportConcerts(concerts, hostname) {
  let wb = new xl.Workbook();
  // Add Worksheets to the workbook
  let ws = wb.addWorksheet("Concerts");
  // Create a reusable style
  let headerStyle = wb.createStyle({
    font: {
      color: "#fca103",
      bold: true,
    },
  });
  let rowStyle = wb.createStyle({
    alignment: {
      wrapText: true,
    },
  });
  //Write headers
  ws.cell(1, 1).string("ID").style(headerStyle);
  ws.cell(1, 2).string("Title").style(headerStyle);
  ws.cell(1, 3).string("Description").style(headerStyle);
  ws.cell(1, 4).string("Date").style(headerStyle);
  ws.cell(1, 5).string("Place").style(headerStyle);
  ws.cell(1, 6).string("Ticket").style(headerStyle);
  ws.cell(1, 7).string("Poster").style(headerStyle);

  ws.column(1).setWidth(5);
  ws.column(2).setWidth(20);
  ws.column(3).setWidth(70);
  ws.column(5).setWidth(20);
  //Write data
  for (let i = 0; i < concerts.length; i++) {
    ws.row(i + 2).setHeight(30);
    ws.cell(i + 2, 1)
      .number(concerts[i].id)
      .style(rowStyle);
    ws.cell(i + 2, 2)
      .string(concerts[i].title)
      .style(rowStyle);
    ws.cell(i + 2, 3)
      .string(concerts[i].description)
      .style(rowStyle);
    ws.cell(i + 2, 4)
      .date(concerts[i].date)
      .style({ ...rowStyle, numberFormat: "yyyy-mm-dd" });
    ws.cell(i + 2, 5)
      .string(concerts[i].place)
      .style(rowStyle);
    ws.cell(i + 2, 6)
      .link(concerts[i].ticket)
      .style(rowStyle);
    ws.cell(i + 2, 7)
      .link(hostname + "/img/posters/" + concerts[i].id + ".jpg")
      .style(rowStyle);
  }

  return wb;
}

module.exports = { ExportConcerts };
