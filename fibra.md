# Projeto de Enlace de Fibra Óptica de 65 km (Longa Distância)

Montar um enlace de fibra óptica de 65 km é um projeto de grande porte, considerado de **longa distância (Long-Haul)**. Para esta distância, o sinal sofre atenuação (perda de potência) e dispersão, exigindo equipamentos e planeamento específicos.

Abaixo encontra o passo a passo estruturado com tudo o que precisa de considerar para a execução deste projeto:

---

## 1. O Meio Físico: Escolha da Fibra

Para uma distância de 65 km, **é obrigatório utilizar Fibra Monomodo (SM - Single Mode)**. A fibra multimodo não tem capacidade para esta distância devido à alta atenuação e dispersão modal.

* **Tipo de Fibra Recomendado:** * **ITU-T G.652.D:** Fibra monomodo padrão com baixa perda de pico de água, amplamente utilizada.
  * **ITU-T G.655 (NZD_F):** Ideal se pretender utilizar sistemas **DWDM** de altíssima capacidade no futuro, pois lida melhor com efeitos não-lineares.
* **Atenuação Teórica:** A fibra monomodo perde cerca de `0.22 dB/km` na janela de comprimento de onda de 1550 nm.
  * *Cálculo base:* $65 \text{ km} \times 0.22 \text{ dB/km} \approx 14.3 \text{ dB}$ de perda apenas no cabo.

---

## 2. Orçamento de Potência (Power Budget)

Antes de adquirir os equipamentos, é necessário calcular o orçamento de potência óptica para garantir que o sinal chega ao destino com intensidade suficiente.

### Fatores de Perda (Atenuação Total Estimada):

1. **Perda do cabo:** $\approx 14.3 \text{ dB}$ (em 1550 nm).
2. **Fusões (Emendas):** Geralmente a fibra é fornecida em bobinas de 2 a 4 km. Estimando cerca de 20 fusões ao longo do caminho a `0.05 dB` por fusão $\approx 1.0 \text{ dB}$.
3. **Conectores e DIOs:** Pelo menos 2 conectores em cada extremidade (no Distribuidor Interno de Óptica - DIO) a `0.3 dB` cada $\approx 1.2 \text{ dB}$.
4. **Margem de Segurança:** Adicione sempre uma margem para futuras manutenções (como reparações de rompimentos e novas fusões) $\approx 3.0 \text{ dB}$.

* **Atenuação Total do Link:** $14.3 + 1.0 + 1.2 + 3.0 = \mathbf{19.5 \text{ dB}}$

Os seus transceivers (GBICs/SFP+) precisam de suportar um orçamento de perda (link budget) de, pelo menos, **20 dB**.

---

## 3. Equipamentos Ativos (Transceivers e Switches)

Para vencer 65 km sem a necessidade de repetidores/regeneradores intermédios, deve escolher a janela de luz e o módulo óptico corretos.

* **Comprimento de Onda:** Utilize obrigatoriamente a janela de **1550 nm** (onde a atenuação do vidro é menor) ou tecnologias **CWDM/DWDM**.
* **Especificação do Módulo (SFP+/XFP/QSFP):** Procure por módulos classificados como **ZR** (Zeal Range - tipicamente até 80 km).
  * *Exemplo:* Um módulo SFP+ 10G ZR de 80 km possui, geralmente, uma potência de transmissão de `0 dBm` e uma sensibilidade de receção de `-23 dBm`, oferecendo um orçamento de link de `23 dB`. Isto cobre com folga os 19.5 dB necessários.

> ⚠️ **Aviso de Segurança (Saturação):** Se testar um módulo ZR (80 km) em bancada com um cabo curto, **poderá queimar o recetor** devido ao excesso de potência. Se a potência de chegada for superior ao limite máximo do recetor, utilize um **atenuador óptico fixo** (ex: 5 dB) no lado da receção.

---

## 4. Infraestrutura e Lançamento

A rota de 65 km precisa de ser viabilizada juridicamente e tecnicamente:

* **Topologia da Rota:**
  * **Aérea:** Partilha de postes de concessionárias de energia ou telecomunicações. Requer um projeto de engenharia aprovado e o pagamento de uma taxa de aluguer por poste.
  * **Subterrânea:** Através de condutas instaladas no solo. É muito mais segura contra vandalismo e intempéries, mas o custo de implementação é significativamente mais elevado.
* **Caixas de Emenda (CEO):** Instale caixas de emenda herméticas nos pontos de transição das bobinas de fibra.
* **Reserva Técnica:** Deixe "sobras" de cabo (em formato de "raquete") a cada 1 ou 2 km e próximo das caixas de emenda para permitir reparações rápidas em caso de rutura.

---

## 5. Homologação e Testes (Ativação)

Após o lançamento e fusão da fibra, o enlace deve ser certificado antes de ligar os switches de produção.

* **Teste com OTDR (Refletómetro Óptico no Domínio do Tempo):** Essencial para medir a distância exata, a atenuação total, o ganho/perda de cada fusão e identificar possíveis curvaturas excessivas (macrocurvaturas) que causem atenuação no cabo.
* **Power Meter (Medidor de Potência):** Mede a potência exata da luz que sai do Ponto A e chega ao Ponto B, garantindo que está dentro da faixa ideal de operação do módulo SFP+.

---

## Resumo do Checklist de Implementação

- [ ] Validar e aprovar o projeto da rota (Postes/Condutas) junto das entidades competentes.
- [ ] Adquirir o cabo de **Fibra Monomodo (G.652.D ou G.655)**.
- [ ] Adquirir **Transceivers SFP+ (ou superior) modelo ZR (80 km) em 1550 nm**.
- [ ] Instalar os DIOs nas duas extremidades e realizar as fusões nas caixas de emenda.
- [ ] Certificar o enlace com **OTDR** e **Power Meter**.
- [ ] Ligar os equipamentos ativos e monitorizar os níveis de sinal (via DMI/DOM) nos switches.
