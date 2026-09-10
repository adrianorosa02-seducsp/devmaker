function obterAbas() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  return {

    ss,

    calendario: ss.getSheetByName(CFG.ABA_CALENDARIO),

    dia: ss.getSheetByName(CFG.ABA_DIA),

    template: ss.getSheetByName(CFG.ABA_TEMPLATE),

    aulas: ss.getSheetByName(CFG.ABA_AULAS)

  };

}