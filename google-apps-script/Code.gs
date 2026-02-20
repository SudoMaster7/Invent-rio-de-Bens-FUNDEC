// ============================================================
//  INVENTÁRIO FUNDEC — Google Apps Script Backend
//
//  Como configurar:
//  1. Crie o script DENTRO da planilha: Extensões > Apps Script
//     OU cole o ID da planilha na constante SPREADSHEET_ID abaixo
//  2. Clique em "Implantar" > "Nova implantação"
//     - Tipo: App da Web
//     - Executar como: Eu (seu e-mail)
//     - Acesso: Qualquer pessoa
//  3. Copie a URL gerada e cole no arquivo .env:
//     VITE_APPS_SCRIPT_URL=<URL copiada>
// ============================================================

// ⚠️  Cole aqui o ID da sua planilha (parte da URL entre /d/ e /edit)
// Exemplo: https://docs.google.com/spreadsheets/d/ESTE_ID_AQUI/edit
const SPREADSHEET_ID = ''

/** Retorna a planilha correta (bound ou por ID) */
function getSpreadsheet() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID)
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  if (!ss) throw new Error('Planilha não encontrada. Preencha a constante SPREADSHEET_ID no topo do script.')
  return ss
}

// Colunas da planilha (ordem da esquerda para direita)
const HEADERS = [
  'Plaqueta Física',
  'Nome do Bem',
  'Descrição do Bem',
  'Marca do Bem',
  'Número de Série',
  'Estado do Bem',
  'Coordenadores',
  'Registrado em',
  'Foto',
]

const PAGE_SIZE = 20

// -----------------------------------------------------------
// Garante que a aba existe e tem cabeçalho correto
// -----------------------------------------------------------
function getOrCreateSheet(spreadsheet, nomeUnidade) {
  let sheet = spreadsheet.getSheetByName(nomeUnidade)
  if (!sheet) {
    sheet = spreadsheet.insertSheet(nomeUnidade)
  }
  // Verifica se já tem cabeçalho
  const firstCell = sheet.getRange(1, 1).getValue()
  if (!firstCell) {
    sheet.appendRow(HEADERS)
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length)
    headerRange
      .setFontWeight('bold')
      .setBackground('#0d2448')
      .setFontColor('#ffffff')
    sheet.setFrozenRows(1)
    // Ajusta largura das colunas
    sheet.setColumnWidth(1, 120)  // Plaqueta
    sheet.setColumnWidth(2, 200)  // Nome
    sheet.setColumnWidth(3, 280)  // Descrição
    sheet.setColumnWidth(4, 150)  // Marca
    sheet.setColumnWidth(5, 160)  // Nº Série
    sheet.setColumnWidth(6, 200)  // Estado
    sheet.setColumnWidth(7, 260)  // Coordenadores
    sheet.setColumnWidth(8, 160)  // Data
    sheet.setColumnWidth(9, 80)   // Foto (link curto)
  }
  return sheet
}

// -----------------------------------------------------------
// POST — roteador de ações: insert | delete
// -----------------------------------------------------------
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)

    // ─── DELETE ──────────────────────────────────────────────
    if (body.action === 'delete') {
      if (!body.unidade || !body.rowNum) {
        return jsonResponse({ success: false, message: 'unidade e rowNum são obrigatórios para exclusão.' })
      }
      const ss    = getSpreadsheet()
      const sheet = ss.getSheetByName(body.unidade)
      if (!sheet) return jsonResponse({ success: false, message: 'Aba não encontrada: ' + body.unidade })
      const rowNum = parseInt(body.rowNum)
      if (rowNum < 2) return jsonResponse({ success: false, message: 'Número de linha inválido.' })
      sheet.deleteRow(rowNum)
      return jsonResponse({ success: true, message: 'Registro excluído.' })
    }

    // ─── INSERT ──────────────────────────────────────────────
    if (!body.unidade) {
      return jsonResponse({ success: false, message: 'Unidade é obrigatória.' })
    }

    const ss    = getSpreadsheet()
    const sheet = getOrCreateSheet(ss, body.unidade)
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    const coordsStr = (body.coordenadores || [])
      .filter(c => c.nome || c.matricula)
      .map(c => c.nome + (c.funcao ? ' - ' + c.funcao : '') + (c.matricula ? ' (' + c.matricula + ')' : ''))
      .join('; ')

    // Foto: se base64, salva direto na célula; se URL, salva URL
    const fotoVal = (body.foto || '').startsWith('data:') ? '(foto local)' : (body.foto || '')

    sheet.appendRow([
      body.plaquetaFisica  || '',
      body.nomeBem         || '',
      body.descricaoBem    || '',
      body.marcaBem        || '',
      body.numeroSerie     || '',
      body.estadoBem       || '',
      coordsStr,
      agora,
      fotoVal,
    ])

    const lastRow  = sheet.getLastRow()
    const rowRange = sheet.getRange(lastRow, 1, 1, HEADERS.length)
    rowRange.setVerticalAlignment('middle')
    if (lastRow % 2 === 0) rowRange.setBackground('#f0f3f8')

    return jsonResponse({ success: true, message: 'Registro salvo na aba: ' + body.unidade })
  } catch (err) {
    return jsonResponse({ success: false, message: err.message })
  }
}

// -----------------------------------------------------------
// GET — lista registros de uma unidade com paginação
// -----------------------------------------------------------
function doGet(e) {
  try {
    const params    = e.parameter || {}
    const unidade   = params.unidade  || ''
    const estadoBem = params.estadoBem || ''
    const busca     = (params.busca || '').toLowerCase().trim()
    const pagina    = Math.max(1, parseInt(params.pagina) || 1)

    const ss = getSpreadsheet()
    const sheets = unidade
      ? [ss.getSheetByName(unidade)].filter(Boolean)
      : ss.getSheets()

    const allRows = []
    const SKIP_SHEETS = ['Sheet1', 'Página1', 'Plan1']
    sheets.forEach(sheet => {
      const nomeAba = sheet.getName()
      if (SKIP_SHEETS.includes(nomeAba)) return
      const data = sheet.getDataRange().getValues()
      // data[0] = cabeçalho, dados começam em index 1 = row 2 na planilha
      data.slice(1).forEach((row, idx) => {
        if (!row[0] && !row[1]) return // pula linhas vazias
        if (estadoBem && row[5] !== estadoBem) return
        if (busca) {
          const haystack = [row[0],row[1],row[2],row[3]].join(' ').toLowerCase()
          if (!haystack.includes(busca)) return
        }
        allRows.push({
          _rowNum:        idx + 2, // linha real na aba (1=header, dados a partir de 2)
          unidade:        nomeAba,
          plaquetaFisica: row[0],
          nomeBem:        row[1],
          descricaoBem:   row[2],
          marcaBem:       row[3],
          numeroSerie:    row[4],
          estadoBem:      row[5],
          coordenadores:  row[6],
          registradoEm:   row[7],
          foto:           row[8] || '',
        })
      })
    })

    // Mais recentes primeiro
    allRows.reverse()

    const total = allRows.length
    const start = (pagina - 1) * PAGE_SIZE
    const registros = allRows.slice(start, start + PAGE_SIZE)

    return jsonResponse({ success: true, registros, total })
  } catch (err) {
    return jsonResponse({ success: false, message: err.message })
  }
}

// -----------------------------------------------------------
// Helper
// -----------------------------------------------------------
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

// -----------------------------------------------------------
// DADOS FAKE — rode esta função UMA vez pelo editor do Apps Script
// para popular a planilha com dados de teste.
// Como usar: no editor, selecione "seedFakeData" e clique em ▶ Executar
// -----------------------------------------------------------
function seedFakeData() {
  const ss = getSpreadsheet()
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const items = [
    { unidade: 'Dr Laureano',         plaqueta: '001001', nome: 'Computador Desktop',          desc: 'CPU com monitor 21"',        marca: 'Dell',         serie: 'DL-78432A',  estado: 'Novo',                       coord: 'Ana Lima - Coordenadora (1001)' },
    { unidade: 'Dr Laureano',         plaqueta: '001002', nome: 'Cadeira Ergonomica',           desc: 'Giratoria c/ apoio lombar',  marca: 'Frisokar',     serie: '',            estado: 'Semi-Novo',                  coord: 'Ana Lima - Coordenadora (1001)' },
    { unidade: 'Dr Laureano',         plaqueta: '001003', nome: 'Impressora Laser',             desc: 'Monocromatica A4',           marca: 'HP',            serie: 'HP-55ABCD',  estado: 'Precisa de Reparo',           coord: 'Carlos Souza - Assistente (1042)' },
    { unidade: 'Chacrinha',           plaqueta: '002001', nome: 'Projetor Multimidia',          desc: '3000 lumens HDMI',           marca: 'Epson',         serie: 'EP-99821X',  estado: 'Novo',                       coord: 'Maria Fernanda - Coordenadora (2010)' },
    { unidade: 'Chacrinha',           plaqueta: '002002', nome: 'Mesa de Reuniao',              desc: '10 lugares MDF',             marca: 'Fiel',          serie: '',            estado: 'Semi-Novo',                  coord: 'Maria Fernanda - Coordenadora (2010)' },
    { unidade: 'Chacrinha',           plaqueta: '002003', nome: 'Ar Condicionado Split',        desc: '12.000 BTUs inverter',       marca: 'Midea',         serie: 'MD-12BTU77', estado: 'Precisa de Grandes Reparos',  coord: 'Joao Batista - Analista de Licitacao (2099)' },
    { unidade: 'FUNDEC-VERDE',        plaqueta: '003001', nome: 'Notebook',                     desc: 'Core i5 8GB 256GB SSD',      marca: 'Lenovo',        serie: 'LN-A4512Z',  estado: 'Novo',                       coord: 'Roberto Alves - Coordenador (3001)' },
    { unidade: 'FUNDEC-VERDE',        plaqueta: '003002', nome: 'Frigobar',                     desc: '120L compressor',             marca: 'Consul',        serie: 'CL-78643',   estado: 'Semi-Novo',                  coord: 'Roberto Alves - Coordenador (3001)' },
    { unidade: 'HOSPITAL DO OLHO',    plaqueta: '004001', nome: 'Autoclave Horizontal',         desc: '21 litros inox',              marca: 'Stermax',       serie: 'ST-210HSP',  estado: 'Novo',                       coord: 'Dra. Patricia Viana - Coordenadora (4050)' },
    { unidade: 'HOSPITAL DO OLHO',    plaqueta: '004002', nome: 'Cadeira de Rodas',             desc: 'Dobravel aluminio',           marca: 'Ortobras',      serie: '',            estado: 'Precisa de Reparo',           coord: 'Dra. Patricia Viana - Coordenadora (4050)' },
    { unidade: 'HOSPITAL DO OLHO',    plaqueta: '004003', nome: 'Maca de Atendimento',          desc: 'Estofada c/ regulagem',       marca: 'Bioset',        serie: 'BS-M450',    estado: 'Semi-Novo',                  coord: 'Lucas Mendes - Assistente Administrativo (4021)' },
    { unidade: 'IFRJ',                plaqueta: '005001', nome: 'Quadro Branco Magnetico',      desc: '200x120cm moldura aluminio',  marca: 'Stalo',         serie: '',            estado: 'Novo',                       coord: 'Prof. Sandro Costa - Coordenador (5010)' },
    { unidade: 'IFRJ',                plaqueta: '005002', nome: 'Servidor de Rede',             desc: 'ProLiant Gen10 8GB',          marca: 'HP',            serie: 'SRV-HP-001', estado: 'Semi-Novo',                  coord: 'Prof. Sandro Costa - Coordenador (5010)' },
    { unidade: 'CEDERJ',              plaqueta: '006001', nome: 'Mesa de Escritorio',           desc: '1,50m com gavetas',           marca: 'Escrilex',      serie: '',            estado: 'Inservivel',                  coord: 'Beatriz Nunes - Coordenadora (6001)' },
    { unidade: 'CEDERJ',              plaqueta: '006002', nome: 'Telefone IP',                  desc: '2 linhas LCD',                marca: 'Grandstream',   serie: 'GS-2160',    estado: 'Novo',                       coord: 'Beatriz Nunes - Coordenadora (6001)' },
    { unidade: 'DEPOSITO - LAFAIETE', plaqueta: '007001', nome: 'Armario de Aco',              desc: '4 portas c/ chave',           marca: 'Artmol',        serie: '',            estado: 'Precisa de Reparo',           coord: 'Fabio Torres - Responsavel Deposito (7001)' },
    { unidade: 'DEPOSITO - LAFAIETE', plaqueta: '007002', nome: 'Pallet de Madeira',           desc: 'PBR 1,20x1,00m',              marca: '',              serie: '',            estado: 'Precisa de Grandes Reparos',  coord: 'Fabio Torres - Responsavel Deposito (7001)' },
    { unidade: 'PILAR',               plaqueta: '008001', nome: 'Camera de Seguranca IP',      desc: 'Full HD 2MP dome',            marca: 'Intelbras',     serie: 'VIP-1020',   estado: 'Novo',                       coord: 'Claudia Ramos - Coordenadora (8002)' },
    { unidade: 'TAMOIO',              plaqueta: '009001', nome: 'Bebedouro Industrial',         desc: '200L/h inox',                 marca: 'Libell',        serie: 'LB-C200',    estado: 'Semi-Novo',                  coord: 'Geraldo Fontes - Coordenador (9001)' },
    { unidade: 'ZECA PAGODINHO',      plaqueta: '010001', nome: 'Sistema de Som',               desc: 'Caixa ativa 15 pol 600W',     marca: 'JBL',           serie: 'JBL-PRX15',  estado: 'Novo',                       coord: 'Simone Leal - Coordenadora (10003)' },
  ]

  items.forEach(function(item) {
    var sheetName = item.unidade
    var sheet = ss.getSheetByName(sheetName)
    if (!sheet) {
      sheet = ss.insertSheet(sheetName)
      sheet.appendRow(HEADERS)
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#0d2448')
        .setFontColor('#ffffff')
      sheet.setFrozenRows(1)
    }
    sheet.appendRow([
      item.plaqueta, item.nome, item.desc, item.marca,
      item.serie, item.estado, item.coord, agora
    ])
    var lastRow = sheet.getLastRow()
    if (lastRow % 2 === 0) sheet.getRange(lastRow, 1, 1, HEADERS.length).setBackground('#f0f3f8')
  })

  SpreadsheetApp.getUi().alert('20 registros de teste criados com sucesso!')
}
