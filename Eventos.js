function onOpen() {

  SpreadsheetApp.getUi()
    .createMenu("📚 Detalhar Aulas")
    .addItem("Abrir dia selecionado", "mostrarDia")
    .addToUi();

}

function onEdit(e) {

  dispararLancamento(e);

}