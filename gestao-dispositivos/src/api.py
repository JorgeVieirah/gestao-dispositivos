import os
import io
import sqlite3
from datetime import datetime
from flask import Flask, jsonify, request, send_file, render_template
from docxtpl import DocxTemplate


# CONFIGURAÇÕES DE CAMINHO

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database', 'gestao_dispositivos.db')
DOCS_DIR = os.path.join(BASE_DIR, 'documentos')

app = Flask(__name__, 
            template_folder=os.path.join(BASE_DIR, 'web', 'templates'),
            static_folder=os.path.join(BASE_DIR, 'web', 'static'))


# INICIALIZAÇÃO DO BANCO DE DADOS

def inicializar_banco():
    """Cria as tabelas automaticamente se elas não existirem."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conexao = sqlite3.connect(DB_PATH)
    cursor = conexao.cursor()
    
    # Tabela 1: Aparelhos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS aparelhos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria TEXT NOT NULL,
            marca TEXT NOT NULL,
            modelo TEXT NOT NULL,
            numero_serie TEXT NOT NULL UNIQUE,
            imei TEXT UNIQUE,
            hostname TEXT,
            tipo_periferico TEXT,
            status TEXT DEFAULT 'Disponível'
        )
    ''')
    
    # Tabela 2: Colaboradores
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS colaboradores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            username TEXT 
        )
    ''')
    
    # Tabela 3: Movimentações (Histórico)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS movimentacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            aparelho_id INTEGER,
            colaborador_id INTEGER,
            tipo_movimentacao TEXT,
            data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            observacao_estado TEXT,
            itens_inclusos TEXT,
            FOREIGN KEY (aparelho_id) REFERENCES aparelhos (id) ON DELETE CASCADE,
            FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id) ON DELETE CASCADE
        )
    ''')
    
    conexao.commit()
    conexao.close()
    print("Banco de dados e tabelas verificados/inicializados com sucesso!")

def conectar_db():
    conexao = sqlite3.connect(DB_PATH)
    conexao.row_factory = sqlite3.Row
    # Habilita suporte a chaves estrangeiras (FOREIGN KEYS) no SQLite
    conexao.execute("PRAGMA foreign_keys = ON")
    return conexao

def row_para_dict(row):
    return dict(row) if row else None


# ROTA PRINCIPAL (INTERFACE WEB)

@app.route('/')
def index():
    return render_template('index.html')


# ROTAS: EQUIPAMENTOS (CRUD COMPLETOS)

@app.route('/aparelhos', methods=['GET'])
def get_aparelhos():
    conexao = None
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()
        cursor.execute("SELECT * FROM aparelhos ORDER BY id DESC")
        return jsonify([row_para_dict(row) for row in cursor.fetchall()])
    finally:
        if conexao: conexao.close()

@app.route('/aparelhos', methods=['POST'])
def cadastrar_aparelho():
    conexao = None
    try:
        dados = request.get_json()
        conexao = conectar_db()
        cursor = conexao.cursor()
        
        categoria = dados.get('categoria', 'Celular')
        imei_recebido = dados.get('imei', '').strip()
        imei_final = imei_recebido if imei_recebido and categoria == 'Celular' else None
        
        cursor.execute("""
            INSERT INTO aparelhos (categoria, marca, modelo, numero_serie, imei, hostname, tipo_periferico, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Disponível')
        """, (
            categoria, dados.get('marca'), dados.get('modelo'),
            dados.get('numero_serie'), imei_final, dados.get('hostname'), 
            dados.get('tipo_periferico')
        ))
        
        conexao.commit()
        return jsonify({"mensagem": "Ativo cadastrado com sucesso!"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"erro": "IMEI ou Número de Série já cadastrado no sistema."}), 400
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conexao: conexao.close()

@app.route('/aparelhos/<int:id>', methods=['PUT'])
def editar_aparelho(id):
    conexao = None
    try:
        dados = request.get_json()
        conexao = conectar_db()
        cursor = conexao.cursor()
        
        categoria = dados.get('categoria', 'Celular')
        imei_recebido = dados.get('imei', '').strip()
        imei_final = imei_recebido if imei_recebido and categoria == 'Celular' else None

        cursor.execute("""
            UPDATE aparelhos 
            SET categoria=?, marca=?, modelo=?, numero_serie=?, imei=?, hostname=?, tipo_periferico=?
            WHERE id=?
        """, (categoria, dados.get('marca'), dados.get('modelo'), dados.get('numero_serie'), 
              imei_final, dados.get('hostname'), dados.get('tipo_periferico'), id))
        conexao.commit()
        return jsonify({"mensagem": "Ativo atualizado com sucesso!"}), 200
    except sqlite3.IntegrityError:
        return jsonify({"erro": "IMEI ou Nº de Série já existe noutro ativo."}), 400
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conexao: conexao.close()

@app.route('/aparelhos/<int:id>', methods=['DELETE'])
def deletar_aparelho(id):
    conexao = None
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()
        
        cursor.execute("SELECT status FROM aparelhos WHERE id=?", (id,))
        ativo = cursor.fetchone()
        if ativo and ativo['status'] == 'Em Uso':
            return jsonify({"erro": "Não é possível excluir um ativo que está Em Uso."}), 400

        cursor.execute("DELETE FROM aparelhos WHERE id=?", (id,))
        conexao.commit()
        return jsonify({"mensagem": "Ativo excluído com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conexao: conexao.close()

@app.route('/aparelhos/<int:id>/responsavel', methods=['GET'])
def get_responsavel(id):
    conexao = None
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()
        cursor.execute("""
            SELECT c.nome FROM movimentacoes m 
            JOIN colaboradores c ON m.colaborador_id = c.id 
            WHERE m.aparelho_id = ? AND m.tipo_movimentacao = 'Saída' 
            ORDER BY m.id DESC LIMIT 1
        """, (id,))
        res = row_para_dict(cursor.fetchone())
        return jsonify(res if res else {"nome": ""})
    finally:
        if conexao: conexao.close()

# ROTAS: COLABORADORES (CRUD COMPLETOS)

@app.route('/colaboradores', methods=['GET', 'POST'])
def gerenciar_colaboradores():
    conexao = None
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()
        
        if request.method == 'GET':
            cursor.execute("SELECT * FROM colaboradores ORDER BY nome ASC")
            return jsonify([row_para_dict(row) for row in cursor.fetchall()])
        else:
            dados = request.get_json()
            cursor.execute("INSERT INTO colaboradores (nome, username) VALUES (?, ?)", 
                           (dados.get('nome'), dados.get('username')))
            conexao.commit()
            return jsonify({"mensagem": "Colaborador cadastrado!"}), 201
    finally:
        if conexao: conexao.close()

@app.route('/colaboradores/<int:id>', methods=['PUT'])
def editar_colaborador(id):
    conexao = None
    try:
        dados = request.get_json()
        conexao = conectar_db()
        cursor = conexao.cursor()
        cursor.execute("UPDATE colaboradores SET nome=?, username=? WHERE id=?", 
                       (dados.get('nome'), dados.get('username'), id))
        conexao.commit()
        return jsonify({"mensagem": "Colaborador atualizado!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conexao: conexao.close()

@app.route('/colaboradores/<int:id>', methods=['DELETE'])
def deletar_colaborador(id):
    conexao = None
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()
        
        cursor.execute("""
            SELECT count(*) as qtd FROM movimentacoes m 
            JOIN aparelhos a ON m.aparelho_id = a.id 
            WHERE m.colaborador_id=? AND a.status='Em Uso' AND m.tipo_movimentacao='Saída'
        """, (id,))
        em_posse = cursor.fetchone()['qtd']
        if em_posse > 0:
            return jsonify({"erro": "O colaborador possui ativos em uso e não pode ser excluído."}), 400

        cursor.execute("DELETE FROM colaboradores WHERE id=?", (id,))
        conexao.commit()
        return jsonify({"mensagem": "Colaborador excluído com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conexao: conexao.close()

# ROTAS: MOVIMENTAÇÕES (SAÍDA E DEVOLUÇÃO)

@app.route('/movimentacoes', methods=['GET'])
def get_movimentacoes():
    conexao = None
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()
        cursor.execute("""
            SELECT m.id, a.modelo as aparelho, c.nome as colaborador, 
                   m.tipo_movimentacao, m.data_movimentacao, m.observacao_estado
            FROM movimentacoes m
            LEFT JOIN aparelhos a ON m.aparelho_id = a.id
            LEFT JOIN colaboradores c ON m.colaborador_id = c.id
            ORDER BY m.id DESC
        """)
        return jsonify([row_para_dict(row) for row in cursor.fetchall()])
    finally:
        if conexao: conexao.close()

@app.route('/movimentacoes/saida', methods=['POST'])
def registrar_saida():
    conexao = None
    try:
        dados = request.get_json()
        aparelho_id = dados.get('aparelho_id')
        colaborador_id = dados.get('colaborador_id')
        obs = dados.get('observacao_estado', '')
        itens = dados.get('acessorios', '')

        conexao = conectar_db()
        cursor = conexao.cursor()
        
        cursor.execute("SELECT status FROM aparelhos WHERE id = ?", (aparelho_id,))
        aparelho = cursor.fetchone()
        
        if not aparelho or aparelho['status'] != 'Disponível':
            return jsonify({"erro": "Ativo não está disponível"}), 400

        cursor.execute("""
            INSERT INTO movimentacoes (aparelho_id, colaborador_id, tipo_movimentacao, observacao_estado, itens_inclusos)
            VALUES (?, ?, 'Saída', ?, ?)
        """, (aparelho_id, colaborador_id, obs, itens))

        cursor.execute("UPDATE aparelhos SET status = 'Em Uso' WHERE id = ?", (aparelho_id,))
        conexao.commit()
        return jsonify({"mensagem": "Saída registrada!"}), 201
    finally:
        if conexao: conexao.close()

@app.route('/movimentacoes/devolucao', methods=['POST'])
def registrar_devolucao():
    conexao = None
    try:
        dados = request.get_json()
        aparelho_id = dados.get('aparelho_id')
        obs = dados.get('observacao_estado', '')
        itens = dados.get('acessorios', '')

        conexao = conectar_db()
        cursor = conexao.cursor()
        
        cursor.execute("SELECT status FROM aparelhos WHERE id = ?", (aparelho_id,))
        aparelho = cursor.fetchone()
        
        if not aparelho or aparelho['status'] != 'Em Uso':
            return jsonify({"erro": "Este ativo não consta como Em Uso"}), 400

        cursor.execute("""
            SELECT colaborador_id FROM movimentacoes 
            WHERE aparelho_id = ? AND tipo_movimentacao = 'Saída' 
            ORDER BY id DESC LIMIT 1
        """, (aparelho_id,))
        ultimo = cursor.fetchone()
        colab_id = ultimo['colaborador_id'] if ultimo else None

        cursor.execute("""
            INSERT INTO movimentacoes (aparelho_id, colaborador_id, tipo_movimentacao, observacao_estado, itens_inclusos)
            VALUES (?, ?, 'Devolução', ?, ?)
        """, (aparelho_id, colab_id, obs, itens))

        cursor.execute("UPDATE aparelhos SET status = 'Disponível' WHERE id = ?", (aparelho_id,))
        conexao.commit()
        return jsonify({"mensagem": "Devolução registrada!"}), 201
    finally:
        if conexao: conexao.close()


# ROTAS: GERAÇÃO DE TERMOS (WORD)

@app.route('/gerar_termo', methods=['POST'])
def gerar_termo():
    conexao = None
    try:
        dados = request.get_json()
        conexao = conectar_db()
        cursor = conexao.cursor()
        
        cursor.execute("SELECT * FROM aparelhos WHERE id = ?", (dados.get('aparelho_id'),))
        ativo = row_para_dict(cursor.fetchone())
        
        cursor.execute("SELECT nome, username FROM colaboradores WHERE id = ?", (dados.get('colaborador_id'),))
        colab = row_para_dict(cursor.fetchone())

        if not ativo or not colab:
            return jsonify({"erro": "Ativo ou Colaborador não encontrado"}), 404

        categoria = ativo.get('categoria', 'Celular')
        
        templates = {
            'Celular': 'Termo_Main_Celular.docx',
            'Notebook': 'Termo_Main_Notebook.docx',
            'Periférico': 'Termo_Main_Perifericos.docx'
        }
        ficheiro_template = templates.get(categoria, 'Termo_Main_Celular.docx')
        
        hoje = datetime.now()
        meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
        
        contexto = {
            **ativo, **dados,
            "nome": colab['nome'], 
            "username": colab.get('username') or '_____',
            "dia": hoje.day, "mês": meses[hoje.month], "ano": hoje.year,
            "ns": ativo.get('numero_serie', '_____')
        }

        doc_path = os.path.join(DOCS_DIR, ficheiro_template)
        if not os.path.exists(doc_path):
            return jsonify({"erro": f"Template {ficheiro_template} não encontrado"}), 500

        doc = DocxTemplate(doc_path)
        doc.render(contexto)
        output = io.BytesIO()
        doc.save(output)
        output.seek(0)
        
        return send_file(output, as_attachment=True, download_name=f"Termo_Saida_{categoria}.docx")
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conexao: conexao.close()

@app.route('/gerar_termo_devolucao', methods=['POST'])
def gerar_termo_devolucao():
    conexao = None
    try:
        dados = request.get_json() or {}
        conexao = conectar_db()
        cursor = conexao.cursor()
        
        # 1. Busca os dados do aparelho no banco
        cursor.execute("SELECT * FROM aparelhos WHERE id = ?", (dados.get('aparelho_id'),))
        ativo = row_para_dict(cursor.fetchone())

        if not ativo:
            return jsonify({"erro": "Ativo não encontrado"}), 404

        # 2. Define o template correto com base na categoria
        categoria = ativo.get('categoria') or 'Celular'
        
        templates_devolucao = {
            'Celular': 'Termo_Devol_Celular.docx',
            'Notebook': 'Termo_Devol_Notebook.docx',
            'Periférico': 'Termo_Devol_Perifericos.docx'
        }
        ficheiro_template = templates_devolucao.get(categoria, 'Termo_Devol_Celular.docx')

        # 3. Prepara as variáveis de data e nome
        meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
        hoje = datetime.now()
        nome_colaborador = dados.get('nome_colab', 'Não Informado')
        
        contexto = {
            **ativo, # Isso injeta TODAS as colunas do banco (numero_serie, imei, marca, modelo, etc.)
            "nome": nome_colaborador,
            "ns": ativo.get('numero_serie') or '_____', # Mantém 'ns' caso o Word use a tag curta
            "contato": dados.get('contato', '_____'),
            "acessorios": dados.get('acessorios', ''),
            "obs": dados.get('obs', ''),
            "dia": hoje.day, 
            "mês": meses[hoje.month], 
            "ano": hoje.year
        }

        # 5. Localiza o template e gera o arquivo
        doc_path = os.path.join(DOCS_DIR, ficheiro_template)
        if not os.path.exists(doc_path):
            return jsonify({"erro": f"Template {ficheiro_template} não encontrado"}), 500

        doc = DocxTemplate(doc_path)
        doc.render(contexto)
        
        # 6. Prepara o arquivo para download em memória
        output = io.BytesIO()
        doc.save(output)
        output.seek(0)

        nome_arquivo = f"Termo_Dev_{categoria}_{nome_colaborador.replace(' ', '_')}.docx"
        return send_file(
            output, 
            as_attachment=True, 
            download_name=nome_arquivo, 
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conexao: conexao.close()

if __name__ == '__main__':
    inicializar_banco() 
    app.run(host='0.0.0.0', port=5000, debug=True)