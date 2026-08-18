import zipfile
import xml.etree.ElementTree as ET
import csv
import json

def convert_excel_to_csv_and_json():
    excel_path = 'resultados_google_maps.xlsx'
    csv_path = 'resultados_google_maps.csv'
    json_path = 'empresas_initial.json'
    
    with zipfile.ZipFile(excel_path) as z:
        sheet_tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = []
        for row in sheet_tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            row_vals = []
            for cell in row.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                is_elem = cell.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is')
                if is_elem is not None:
                    t_elem = is_elem.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                    val = t_elem.text if t_elem is not None else ''
                else:
                    v_elem = cell.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = v_elem.text if v_elem is not None else ''
                row_vals.append(val if val is not None else '')
            rows.append(row_vals)

    headers = ['id', 'nome', 'endereco', 'telefone', 'website', 'emails', 'redes_sociais', 'pistas_responsavel', 'link_maps', 'status', 'origem', 'observacoes', 'historico']
    
    # Mapeamento do Excel original
    # 0: Nome, 1: Endereco, 2: Telefone, 3: Website, 4: E-mails, 5: Redes Sociais, 6: Pistas sobre Responsável, 7: Link Google Maps
    formatted_data = []
    
    for idx, r in enumerate(rows[1:], start=1):
        if not r or not r[0]:
            continue
        nome = r[0] if len(r) > 0 else ""
        endereco = r[1] if len(r) > 1 else ""
        telefone = r[2] if len(r) > 2 else ""
        website = r[3] if len(r) > 3 else ""
        emails = r[4] if len(r) > 4 else ""
        redes = r[5] if len(r) > 5 else ""
        pistas = r[6] if len(r) > 6 else ""
        link_maps = r[7] if len(r) > 7 else ""
        
        empresa = {
            "id": idx,
            "nome": nome,
            "endereco": endereco,
            "telefone": telefone,
            "website": website,
            "emails": emails,
            "redes_sociais": redes,
            "pistas_responsavel": pistas,
            "link_maps": link_maps,
            "status": "Não Contatado", # Opções: Não Contatado, Em Contato, Proposta Enviada, Parceria Confirmada, Recusado
            "origem": "Busca Ativa Maps",
            "observacoes": "",
            "historico": [
                {
                    "data": "2026-08-17T10:00:00",
                    "tipo": "Importação",
                    "descricao": "Empresa importada da Busca Ativa (Google Maps)."
                }
            ]
        }
        formatted_data.append(empresa)

    # Escrever CSV
    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['id', 'nome', 'endereco', 'telefone', 'website', 'emails', 'redes_sociais', 'pistas_responsavel', 'link_maps', 'status', 'origem', 'observacoes'])
        for item in formatted_data:
            row_copy = item.copy()
            del row_copy['historico']
            writer.writerow(row_copy)
            
    # Escrever JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(formatted_data, f, ensure_ascii=False, indent=2)

    print(f"Sucesso! {len(formatted_data)} empresas convertidas para CSV e JSON.")

if __name__ == "__main__":
    convert_excel_to_csv_and_json()
