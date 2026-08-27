# ==============================================================================
# MVP DE SUPORTE / HELP DESK EM TKINTER (SEM CLASSES - CÓDIGO SIMPLES)
# 2 Telas: Tela 1 (Abrir Chamado) e Tela 2 (Atendimento / Status do Chamado)
# ==============================================================================

import tkinter as tk
from tkinter import messagebox
import random

# Variável global para guardar as informações do chamado
dados_chamado = {}

# 1. CRIAMOS A JANELA PRINCIPAL
janela = tk.Tk()
janela.title("Help Desk - Chamados de Suporte")
janela.geometry("460x500")
janela.configure(bg="#f0f4f8")

# ------------------------------------------------------------------------------
# FUNÇÃO AUXILIAR PARA APAGAR OS ELEMENTOS DA TELA ANTERIOR
# ------------------------------------------------------------------------------
def limpar_tela():
    for elemento in janela.winfo_children():
        elemento.destroy()

# ------------------------------------------------------------------------------
# TELA 1: ABERTURA DO CHAMADO DE HELP DESK
# ------------------------------------------------------------------------------
def mostrar_tela_1():
    limpar_tela()

    titulo = tk.Label(janela, text="🎧 Abrir Chamado Help Desk", font=("Arial", 15, "bold"), bg="#f0f4f8", fg="#1e293b")
    titulo.pack(pady=(25, 5))

    subtitulo = tk.Label(janela, text="Preencha os dados do problema técnico:", font=("Arial", 10), bg="#f0f4f8")
    subtitulo.pack(pady=(0, 20))

    # Campo: Solicitante
    lbl_nome = tk.Label(janela, text="Nome do Solicitante:", font=("Arial", 10, "bold"), bg="#f0f4f8")
    lbl_nome.pack(anchor="w", padx=40)
    
    global campo_nome
    campo_nome = tk.Entry(janela, font=("Arial", 11), width=32)
    campo_nome.insert(0, "Carlos Santos")
    campo_nome.pack(padx=40, pady=(2, 12))

    # Campo: Setor
    lbl_setor = tk.Label(janela, text="Setor / Departamento:", font=("Arial", 10, "bold"), bg="#f0f4f8")
    lbl_setor.pack(anchor="w", padx=40)
    
    global campo_setor
    campo_setor = tk.Entry(janela, font=("Arial", 11), width=32)
    campo_setor.insert(0, "Financeiro")
    campo_setor.pack(padx=40, pady=(2, 12))

    # Campo: Descrição do Problema
    lbl_problema = tk.Label(janela, text="Descrição do Problema:", font=("Arial", 10, "bold"), bg="#f0f4f8")
    lbl_problema.pack(anchor="w", padx=40)
    
    global campo_problema
    campo_problema = tk.Entry(janela, font=("Arial", 11), width=32)
    campo_problema.insert(0, "Impressora não conecta na rede")
    campo_problema.pack(padx=40, pady=(2, 20))

    # Botão para abrir o chamado e ir para a Tela 2
    btn_abrir = tk.Button(
        janela, 
        text="Abrir Chamado ➡️", 
        font=("Arial", 11, "bold"), 
        bg="#2563eb", 
        fg="white", 
        padx=15, 
        pady=8,
        cursor="hand2",
        command=validar_e_abrir
    )
    btn_abrir.pack()

def validar_e_abrir():
    nome = campo_nome.get()
    setor = campo_setor.get()
    problema = campo_problema.get()

    if nome == "" or setor == "" or problema == "":
        messagebox.showwarning("Aviso", "Preencha todos os campos antes de abrir o chamado!")
    else:
        # Salva as informações do chamado
        dados_chamado["id"] = f"#{random.randint(1000, 9999)}"
        dados_chamado["nome"] = nome
        dados_chamado["setor"] = setor
        dados_chamado["problema"] = problema
        dados_chamado["status"] = "Pendente"
        
        mostrar_tela_2()

# ------------------------------------------------------------------------------
# TELA 2: ACOMPANHAMENTO E STATUS DO CHAMADO
# ------------------------------------------------------------------------------
def mostrar_tela_2():
    limpar_tela()

    titulo = tk.Label(janela, text=f"Chamado {dados_chamado['id']}", font=("Arial", 14, "bold"), bg="#f0f4f8", fg="#1e293b")
    titulo.pack(pady=(20, 2))

    subtitulo = tk.Label(janela, text="Painel de Atendimento Técnico", font=("Arial", 10), bg="#f0f4f8", fg="#64748b")
    subtitulo.pack(pady=(0, 15))

    # Quadro com informações do chamado
    quadro = tk.Frame(janela, bg="#ffffff", bd=1, relief="solid")
    quadro.pack(padx=30, pady=5, fill="both", expand=True)

    tk.Label(quadro, text=f"Solicitante: {dados_chamado['nome']}", font=("Arial", 10, "bold"), bg="#ffffff", anchor="w").pack(fill="x", padx=15, pady=(15, 5))
    tk.Label(quadro, text=f"Setor: {dados_chamado['setor']}", font=("Arial", 10), bg="#ffffff", anchor="w").pack(fill="x", padx=15, pady=5)
    tk.Label(quadro, text=f"Problema: {dados_chamado['problema']}", font=("Arial", 10), bg="#ffffff", anchor="w", wraplength=340, justify="left").pack(fill="x", padx=15, pady=5)

    tk.Label(quadro, text="Status do Atendimento (clique p/ alterar):", font=("Arial", 9, "bold"), bg="#ffffff", fg="#475569").pack(anchor="w", padx=15, pady=(15, 5))

    # Botão interativo para mudar o status
    global btn_status
    btn_status = tk.Button(
        quadro, 
        text=dados_chamado["status"], 
        font=("Arial", 10, "bold"), 
        bg="#ef4444", 
        fg="white", 
        width=18,
        cursor="hand2",
        command=mudar_status
    )
    btn_status.pack(anchor="w", padx=15, pady=(0, 15))

    # Rodapé com botões
    rodape = tk.Frame(janela, bg="#f0f4f8")
    rodape.pack(pady=15)

    btn_novo = tk.Button(rodape, text="⬅️ Novo Chamado", font=("Arial", 10), command=mostrar_tela_1)
    btn_novo.pack(side="left", padx=10)

    btn_concluir = tk.Button(
        rodape, 
        text="💾 Concluir Atendimento", 
        font=("Arial", 10, "bold"), 
        bg="#16a34a", 
        fg="white", 
        command=concluir_atendimento
    )
    btn_concluir.pack(side="left", padx=10)

def mudar_status():
    if dados_chamado["status"] == "Pendente":
        dados_chamado["status"] = "Em Atendimento"
        btn_status.config(text="Em Atendimento", bg="#eab308")
    elif dados_chamado["status"] == "Em Atendimento":
        dados_chamado["status"] = "Resolvido"
        btn_status.config(text="Resolvido", bg="#22c55e")
    else:
        dados_chamado["status"] = "Pendente"
        btn_status.config(text="Pendente", bg="#ef4444")

def concluir_atendimento():
    resumo = (
        f"Chamado Finalizado com Sucesso!\n\n"
        f"Código: {dados_chamado['id']}\n"
        f"Solicitante: {dados_chamado['nome']}\n"
        f"Setor: {dados_chamado['setor']}\n"
        f"Status Final: {dados_chamado['status']}"
    )
    messagebox.showinfo("Suporte Concluído", resumo)
    mostrar_tela_1()

# ------------------------------------------------------------------------------
# INÍCIO DO PROGRAMA
# ------------------------------------------------------------------------------
mostrar_tela_1()
janela.mainloop()
