from flask import Flask, jsonify, request, render_template, send_file
import io
from docxtpl import DocxTemplate
from datetime import datetime
from flask_cors import CORS
import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'web', 'templates'),
    static_folder=os.path.join(BASE_DIR, 'web', 'static'),
    static_url_path='/static'
)
CORS(app)

caminho_db = os.path.join(BASE_DIR, 'database', 'gestao_dispositivos.db')


def conectar_db():
    conexao = sqlite3.connect(caminho_db)
    conexao.row_factory = sqlite3.Row
    return conexao

def rows_para_lista(rows):
    return [dict(row) for row in rows]

def row_para_dict(row):
    return dict(row) if row else None


# ─────────────────────────────────────────
#  DASHBOARD (serve o HTML)
# ─────────────────────────────────────────

@app.route('/')
def dashboard():
    return render_template('index.html')

# 👉 NOVA ROTA: O "Ping" para o JavaScript saber que a API está viva
@app.route('/status', methods=['GET'])
def status_api():
    return jsonify({"status": "Online"})


# ─────────────────────────────────────────
#  APARELHOS
# ─────────────────────────────────────────

@app.route('/aparelhos', methods=['GET'])
def get_aparelhos():
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()
        cursor.execute("SELECT id, modelo, imei, numero_serie, status FROM aparelhos")
        resultados = rows_para_lista(cursor.fetchall())
        conexao.close()
        return jsonify(resultados)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/aparelhos/<int:id>', methods=['GET'])
def get_aparelho(id):
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()
        cursor.execute("SELECT id, modelo, imei, numero_serie, status FROM aparelhos WHERE id = ?", (id,))
        aparelho = row_para_dict(cursor.fetchone())
        conexao.close()
        if not aparelho:
            return jsonify({"erro": f"Aparelho {id} não encontrado"}), 404
        return jsonify(aparelho)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/aparelhos', methods=['POST'])
def add_aparelho():
    try:
        dados = request.get_json() or {}
        modelo = dados.get('modelo', '').strip()
        imei = dados.get('imei', '').strip()
        numero_serie = dados.get('numero_serie', '').strip()
        status = dados.get('status', 'Disponível').strip()

        if not modelo or not imei or not numero_serie:
            return jsonify({"erro": "Campos obrigatórios: modelo, imei, numero_serie"}), 400

        conexao = conectar_db()
        cursor = conexao.cursor()
        cursor.execute(
            "INSERT INTO aparelhos (modelo, imei, numero_serie, status) VALUES (?, ?, ?, ?)",
            (modelo, imei, numero_serie, status)
        )
        conexao.commit()
        novo_id = cursor.lastrowid
        conexao.close()
        return jsonify({"mensagem": "Aparelho cadastrado com sucesso!", "id": novo_id}), 201

    except sqlite3.IntegrityError:
        return jsonify({"erro": "IMEI ou Número de Série já cadastrado"}), 409
    except Exception as e:
        return jsonify({"erro": str(e)}), 400


@app.route('/aparelhos/<int:id>', methods=['PUT'])
def atualizar_aparelho(id):
    try:
        dados = request.get_json() or {}
        campos_permitidos = ['modelo', 'imei', 'numero_serie', 'status']
        campos_atualizar = {k: v for k, v in dados.items() if k in campos_permitidos and v}

        if not campos_atualizar:
            return jsonify({"erro": "Nenhum campo válido para atualizar"}), 400

        set_sql = ", ".join([f"{campo} = ?" for campo in campos_atualizar])
        valores = list(campos_atualizar.values()) + [id]

        conexao = conectar_db()
        cursor = conexao.cursor()
        cursor.execute(f"UPDATE aparelhos SET {set_sql} WHERE id = ?", valores)
        conexao.commit()

        if cursor.rowcount == 0:
            conexao.close()
            return jsonify({"erro": f"Aparelho {id} não encontrado"}), 404

        conexao.close()
        return jsonify({"mensagem": f"Aparelho {id} atualizado com sucesso!"})

    except sqlite3.IntegrityError:
        return jsonify({"erro": "IMEI ou Número de Série já pertence a outro aparelho"}), 409
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/aparelhos/<int:id>', methods=['DELETE'])
def deletar_aparelho(id):
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()
        cursor.execute("DELETE FROM aparelhos WHERE id = ?", (id,))
        conexao.commit()

        if cursor.rowcount == 0:
            conexao.close()
            return jsonify({"erro": f"Aparelho {id} não encontrado"}), 404

        conexao.close()
        return jsonify({"mensagem": f"Aparelho {id} excluído com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# ─────────────────────────────────────────
#  MOVIMENTAÇÕES
# ─────────────────────────────────────────

@app.route('/movimentacoes', methods=['GET'])
def get_movimentacoes():
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()
        cursor.execute("""
            SELECT
                m.id,
                m.tipo_movimentacao,
                m.data_movimentacao,
                m.observacao_estado,
                m.itens_inclusos,
                a.modelo AS aparelho,
                IFNULL(c.nome, 'NÃO IDENTIFICADO') AS colaborador
            FROM movimentacoes m
            LEFT JOIN aparelhos a ON m.aparelho_id = a.id
            LEFT JOIN colaboradores c ON m.colaborador_id = c.id
            ORDER BY m.data_movimentacao DESC
        """)
        resultados = rows_para_lista(cursor.fetchall())
        conexao.close()
        return jsonify(resultados)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/movimentacoes/saida', methods=['POST'])
def registrar_saida():
    try:
        dados = request.get_json() or {}
        aparelho_id = dados.get('aparelho_id')
        colaborador_id = dados.get('colaborador_id')
        tipo = dados.get('tipo_movimentacao', 'Saída')
        obs = dados.get('observacao_estado', '')
        itens = dados.get('itens_inclusos', '')

        if not aparelho_id or not colaborador_id:
            return jsonify({"erro": "Campos obrigatórios: aparelho_id, colaborador_id"}), 400

        conexao = conectar_db()
        cursor = conexao.cursor()

        cursor.execute("SELECT status FROM aparelhos WHERE id = ?", (aparelho_id,))
        aparelho = cursor.fetchone()

        if not aparelho:
            conexao.close()
            return jsonify({"erro": f"Aparelho {aparelho_id} não encontrado"}), 404

        if aparelho['status'] != 'Disponível':
            conexao.close()
            return jsonify({"erro": f"Aparelho não disponível. Status atual: {aparelho['status']}"}), 409

        cursor.execute(
            "INSERT INTO movimentacoes (aparelho_id, colaborador_id, tipo_movimentacao, observacao_estado, itens_inclusos) VALUES (?, ?, ?, ?, ?)",
            (aparelho_id, colaborador_id, tipo, obs, itens)
        )
        cursor.execute("UPDATE aparelhos SET status = 'Em Uso' WHERE id = ?", (aparelho_id,))
        conexao.commit()
        conexao.close()
        return jsonify({"mensagem": "Saída registrada com sucesso!"}), 201

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/movimentacoes/devolucao', methods=['POST'])
def registrar_devolucao():
    try:
        dados = request.get_json() or {}
        aparelho_id = dados.get('aparelho_id')
        obs = dados.get('observacao_estado', '')
        itens = dados.get('itens_inclusos', '')

        if not aparelho_id:
            return jsonify({"erro": "Campo obrigatório: aparelho_id"}), 400

        conexao = conectar_db()
        cursor = conexao.cursor()

        cursor.execute("SELECT status FROM aparelhos WHERE id = ?", (aparelho_id,))
        aparelho = cursor.fetchone()

        if not aparelho:
            conexao.close()
            return jsonify({"erro": f"Aparelho {aparelho_id} não encontrado"}), 404

        if aparelho['status'] != 'Em Uso':
            conexao.close()
            return jsonify({"erro": f"Aparelho não está em uso. Status atual: {aparelho['status']}"}), 409

        cursor.execute(
            "INSERT INTO movimentacoes (aparelho_id, tipo_movimentacao, observacao_estado, itens_inclusos) VALUES (?, 'Devolução', ?, ?)",
            (aparelho_id, obs, itens)
        )
        cursor.execute("UPDATE aparelhos SET status = 'Disponível' WHERE id = ?", (aparelho_id,))
        conexao.commit()
        conexao.close()
        return jsonify({"mensagem": f"Devolução registrada! Aparelho {aparelho_id} está Disponível."}), 201

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# ─────────────────────────────────────────
#  COLABORADORES
# ─────────────────────────────────────────

@app.route('/colaboradores', methods=['GET'])
def get_colaboradores():
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()
        cursor.execute("SELECT id, nome FROM colaboradores ORDER BY nome")
        resultados = rows_para_lista(cursor.fetchall())
        conexao.close()
        return jsonify(resultados)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/colaboradores', methods=['POST'])
def add_colaborador():
    try:
        dados = request.get_json() or {}
        nome = dados.get('nome', '').strip()

        if not nome:
            return jsonify({"erro": "Campo obrigatório: nome"}), 400

        conexao = conectar_db()
        cursor = conexao.cursor()
        cursor.execute("INSERT INTO colaboradores (nome) VALUES (?)", (nome,))
        conexao.commit()
        novo_id = cursor.lastrowid
        conexao.close()
        return jsonify({"mensagem": "Colaborador cadastrado!", "id": novo_id}), 201

    except sqlite3.IntegrityError:
        return jsonify({"erro": "Colaborador já cadastrado"}), 409
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/gerar_termo', methods=['POST'])
def gerar_termo():
    try:
        dados = request.get_json() or {}
        
        # Mapeamento de meses para ficar em português
        meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
        hoje = datetime.now()

        # Monta o "Dicionário de Variáveis" que vai substituir os {{ }} no Word
        contexto = {
            "nome": dados.get('nome', 'NÃO INFORMADO'),
            "matricula": dados.get('matricula', '_____'),
            "marca": dados.get('marca', '_____'),
            "modelo": dados.get('modelo', '_____'),
            "imei": dados.get('imei', '_____'),
            "ns": dados.get('numero_serie', '_____'),
            "contato": dados.get('contato', '_____'),
            "obs": dados.get('obs', ''),
            "dia": hoje.day,
            "mês": meses[hoje.month],
            "ano": hoje.year
        }

        # Carrega o seu Termo_Main.docx
        caminho_template = os.path.join(BASE_DIR, 'documentos', 'Termo_Main.docx')
        doc = DocxTemplate(caminho_template)
        
        # Faz a mágica da substituição
        doc.render(contexto)

        # Salva o resultado na memória (sem criar lixo no seu HD)
        file_stream = io.BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)

        # Envia o arquivo de volta para o navegador fazer o download!
        nome_arquivo = f"Termo_{contexto['nome'].replace(' ', '_')}.docx"
        return send_file(file_stream, as_attachment=True, download_name=nome_arquivo, mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document')

    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    
@app.route('/gerar_termo_devolucao', methods=['POST'])
def gerar_termo_devolucao():
    try:
        dados = request.get_json() or {}
        
        meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
        hoje = datetime.now()

        # Monta as variáveis que o Word está esperando
        contexto = {
            "nome": dados.get('nome', 'NÃO INFORMADO'),
            "marca": dados.get('marca', '_____'),
            "modelo": dados.get('modelo', '_____'),
            "imei": dados.get('imei', '_____'),
            "contato": dados.get('contato', '_____'),
            "obs": dados.get('obs', ''),
            "dia": hoje.day,
            "mês": meses[hoje.month],
            "ano": hoje.year
        }

        # Carrega o seu modelo de devolução
        caminho_template = os.path.join(BASE_DIR, 'documentos', 'Termo_Devol_Celular.docx')
        doc = DocxTemplate(caminho_template)
        
        doc.render(contexto)

        file_stream = io.BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)

        nome_arquivo = f"Termo_Devolucao_{contexto['nome'].replace(' ', '_')}.docx"
        return send_file(file_stream, as_attachment=True, download_name=nome_arquivo, mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document')

    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/aparelhos/<int:id>/responsavel', methods=['GET'])
def get_responsavel_aparelho(id):
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()
        # Busca o nome do colaborador da última 'Saída' deste aparelho
        cursor.execute("""
            SELECT c.nome 
            FROM movimentacoes m
            JOIN colaboradores c ON m.colaborador_id = c.id
            WHERE m.aparelho_id = ? AND m.tipo_movimentacao = 'Saída'
            ORDER BY m.id DESC LIMIT 1
        """, (id,))
        resultado = row_para_dict(cursor.fetchone())
        conexao.close()

        if resultado:
            return jsonify(resultado) # Retorna {"nome": "Nome da Pessoa"}
        else:
            return jsonify({"nome": ""}), 404
            
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)