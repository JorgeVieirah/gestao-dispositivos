import sqlite3
import os

caminho_projeto = os.path.dirname(os.path.dirname(__file__))
caminho_db = os.path.join(caminho_projeto, 'database', 'gestao_dispositivos.db')

def conectar_db():
    conexao = sqlite3.connect(caminho_db)
    conexao.row_factory = sqlite3.Row
    return conexao


def listar_aparelhos():

    try:
        conexao = conectar_db()
        cursor = conexao.cursor()

        cursor.execute("SELECT id, modelo, imei, numero_serie, status FROM aparelhos")
        aparelhos = cursor.fetchall()

        if not aparelhos:
            print("Nenhum aparelho cadastrado.")
        else:
            print("\n--- Lista de Aparelhos Cadastrados ---")
            print(f"{'ID':<5} | {'MODELO':<20} | {'IMEI':<18} | {'N° DE SÉRIE':<15} | {'STATUS'}")
            print("-" * 75)
            for a in aparelhos:
                print(f"{a['id']:<5} | {a['modelo']:<20} | {a['imei']:<18} | {a['numero_serie']:<15} | {a['status']}")

        conexao.close()
    except Exception as e:
        print(f"Erro ao listar: {e}")


def cadastrar_aparelho():
    print("\n--- Cadastro de Novo Aparelho ---")
    modelo = input("Modelo do aparelho: ").strip()
    imei = input("IMEI do aparelho: ").strip()
    serie = input("Número de série do aparelho: ").strip()

    if not modelo or not imei or not serie:
        print("\n Erro: Modelo, IMEI e Número de Série são obrigatórios.")
        return

    status = "Disponível"

    try:
        conexao = conectar_db()
        cursor = conexao.cursor()

        sql = """
        INSERT INTO aparelhos (modelo, imei, numero_serie, status)
        VALUES (?, ?, ?, ?)
        """
        cursor.execute(sql, (modelo, imei, serie, status))
        conexao.commit()

        print(f"\n Sucesso: '{modelo}' cadastrado com ID {cursor.lastrowid}!")

    except sqlite3.IntegrityError:
        print("\n Erro: Este IMEI ou Número de Série já existe no sistema.")
    except sqlite3.Error as e:
        print(f"Erro ao cadastrar aparelho: {e}")
    finally:
        conexao.close()


def registrar_saida():
    
    print("\n--- Registrar Saída de Aparelho ---")

    id_aparelho = input("ID do aparelho a ser retirado: ").strip()
    id_colaborador = input("ID do colaborador: ").strip()
    tipo_movimentacao = input("Tipo de movimentação: ").strip()
    obs = input("Observações: ").strip()
    itens = input("Itens inclusos: ").strip()

    try:
        conexao = conectar_db()
        cursor = conexao.cursor()

        cursor.execute("SELECT status FROM aparelhos WHERE id = ?", (id_aparelho,))
        aparelho = cursor.fetchone()

        if not aparelho:
            print(f"\n Erro: Aparelho com ID {id_aparelho} não encontrado.")
            conexao.close()
            return

        if aparelho['status'] != 'Disponível':
            print(f"\n Erro: Aparelho ID {id_aparelho} não está disponível (status atual: {aparelho['status']}).")
            conexao.close()
            return

        sql_mov = """
        INSERT INTO movimentacoes (aparelho_id, colaborador_id, tipo_movimentacao, observacao_estado, itens_inclusos)
        VALUES (?, ?, ?, ?, ?)
        """
        cursor.execute(sql_mov, (id_aparelho, id_colaborador, tipo_movimentacao, obs, itens))

        cursor.execute("UPDATE aparelhos SET status = 'Em Uso' WHERE id = ?", (id_aparelho,))

        conexao.commit()
        print("\n Saída registrada com sucesso!")

    except Exception as e:
        print(f"Erro ao registrar saída: {e}")
    finally:
        conexao.close()


def registrar_devolucao():
    print("\n=== Registrar Devolução de Aparelho ===")

    id_aparelho = input("ID do aparelho devolvido: ").strip()
    obs_estado = input("Observações sobre o estado do aparelho: ").strip()
    itens = input("Itens devolvidos: ").strip()

    try:
        conexao = conectar_db()
        cursor = conexao.cursor()

        cursor.execute("SELECT status FROM aparelhos WHERE id = ?", (id_aparelho,))
        aparelho = cursor.fetchone()

        if not aparelho:
            print(f"\n Erro: Aparelho com ID {id_aparelho} não encontrado.")
            conexao.close()
            return

        if aparelho['status'] != 'Em Uso':
            print(f"\n Erro: Aparelho ID {id_aparelho} não está em uso (status atual: {aparelho['status']}).")
            conexao.close()
            return

        sql_mov = """
        INSERT INTO movimentacoes (aparelho_id, tipo_movimentacao, observacao_estado, itens_inclusos)
        VALUES (?, 'Devolução', ?, ?)
        """
        cursor.execute(sql_mov, (id_aparelho, obs_estado, itens))

        cursor.execute("UPDATE aparelhos SET status = 'Disponível' WHERE id = ?", (id_aparelho,))

        conexao.commit()
        print(f"\n Devolução registrada! Aparelho ID {id_aparelho} está Disponível.")

    except Exception as e:
        print(f"Erro ao registrar devolução: {e}")
    finally:
        conexao.close()


def relatorio_cautelas():
    print("\n==== Relatório de Cautelas (Em Uso) ====")
    print("-" * 90)
    try:
        conexao = conectar_db()
        cursor = conexao.cursor()

        sql = """
        SELECT
            a.modelo,
            IFNULL(c.nome, 'NÃO IDENTIFICADO') AS colaborador,
            IFNULL(m.data_movimentacao, 'SEM REGISTRO') AS data,
            IFNULL(m.itens_inclusos, '-') AS itens
        FROM aparelhos a
        LEFT JOIN movimentacoes m ON a.id = m.aparelho_id
        LEFT JOIN colaboradores c ON m.colaborador_id = c.id
        WHERE a.status = 'Em Uso'
        ORDER BY m.data_movimentacao DESC
        """

        cursor.execute(sql)
        resultados = cursor.fetchall()

        if not resultados:
            print("Nenhum aparelho está em uso no momento.")
        else:
            print(f"{'APARELHO':<20} | {'COLABORADOR':<20} | {'DATA':<20} | {'ITENS INCLUSOS':<20}")
            print("-" * 90)
            for r in resultados:
                print(f"{r['modelo']:<20} | {r['colaborador']:<20} | {r['data']:<20} | {r['itens']:<20}")

        conexao.close()
    except Exception as e:
        print(f"Erro ao gerar relatório: {e}")


def historico_aparelho():
    print("\n==== Histórico de Movimentações ====")
    id_busca = input("Digite o ID do aparelho para consultar: ").strip()

    try:
        conexao = conectar_db()
        cursor = conexao.cursor()

        cursor.execute("SELECT modelo, numero_serie FROM aparelhos WHERE id = ?", (id_busca,))
        aparelho = cursor.fetchone()

        if not aparelho:
            print("Aparelho não encontrado.")
            conexao.close()
            return

        print(f"\nHistórico do aparelho: {aparelho['modelo']} (N° de Série: {aparelho['numero_serie']})")
        print("-" * 70)

        sql = """
        SELECT
            m.data_movimentacao,
            m.tipo_movimentacao,
            IFNULL(c.nome, 'NÃO IDENTIFICADO') AS colaborador,
            m.observacao_estado
        FROM movimentacoes m
        LEFT JOIN colaboradores c ON m.colaborador_id = c.id
        WHERE m.aparelho_id = ?
        ORDER BY m.data_movimentacao DESC
        """

        cursor.execute(sql, (id_busca,))
        historico = cursor.fetchall()

        if not historico:
            print("Nenhuma movimentação registrada para este aparelho.")
        else:
            for h in historico:
                print(f"[{h['data_movimentacao']}] {h['tipo_movimentacao']} | {h['colaborador']} | {h['observacao_estado']}")

        conexao.close()
    except Exception as e:
        print(f"Erro ao consultar histórico: {e}")


def buscar_aparelho():
    print("\n==== Busca de Aparelho ====")
    termo = input("Digite o N° de Série ou IMEI para buscar: ").strip()

    try:
        conexao = conectar_db()
        cursor = conexao.cursor()

        sql = """
        SELECT id, modelo, imei, numero_serie, status
        FROM aparelhos
        WHERE imei LIKE ? OR numero_serie LIKE ?
        """

        busca = f"%{termo}%"

        cursor.execute(sql, (busca, busca))
        resultados = cursor.fetchall()

        if not resultados:
            print("Nenhum aparelho encontrado com o dado fornecido.")
        else:
            print(f"\n{'ID':<5} | {'MODELO':<20} | {'IMEI':<18} | {'N° DE SÉRIE':<15} | {'STATUS'}")
            print("-" * 75)
            for r in resultados:
                print(f"{r['id']:<5} | {r['modelo']:<20} | {r['imei']:<18} | {r['numero_serie']:<15} | {r['status']}")

        conexao.close()
    except Exception as e:
        print(f"Erro ao buscar aparelho: {e}")


def main():
    while True:
        print("\n===== Sistema de Gestão de Dispositivos =====")
        print("1. Cadastrar novo aparelho")
        print("2. Listar aparelhos cadastrados")
        print("3. Registrar saída de aparelho")
        print("4. Registrar devolução de aparelho")
        print("5. Relatório de cautelas ativas")
        print("6. Histórico de um aparelho")
        print("7. Buscar aparelho por IMEI ou N° de Série")
        print("8. Sair")

        opcao = input("\nEscolha uma opção: ").strip()

        if opcao == "1":
            cadastrar_aparelho()
        elif opcao == "2":
            listar_aparelhos()
        elif opcao == "3":
            registrar_saida()
        elif opcao == "4":
            registrar_devolucao()
        elif opcao == "5":
            relatorio_cautelas()
        elif opcao == "6":
            historico_aparelho()
        elif opcao == "7":
            buscar_aparelho()
        elif opcao == "8":
            print("\nEncerrando sistema... Até logo!")
            break
        else:
            print("Opção inválida. Tente novamente.")


if __name__ == "__main__":
    main()