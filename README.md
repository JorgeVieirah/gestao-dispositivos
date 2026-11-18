# Gestão de Dispositivos (ITAM)

Sistema para controlar o inventário de aparelhos corporativos (celulares, notebooks e periféricos): quem está com cada equipamento, histórico de saídas e devoluções e geração automática dos termos de responsabilidade.

Nasceu de uma necessidade real do meu trabalho em infraestrutura: o controle era feito em planilhas e os termos eram preenchidos à mão.

## Funcionalidades

- Cadastro, edição e exclusão de **aparelhos** (marca, modelo, nº de série, IMEI)
- Cadastro de **colaboradores**
- Registro de **saída** e **devolução** de equipamentos, com histórico de movimentações
- Geração de **termos de responsabilidade** de saída e devolução em `.docx`, a partir de modelos
- **Dashboard** com visão geral do inventário
- Acesso pelo **painel web** ou pelo **app mobile**

## Arquitetura

```
app mobile (React Native / Expo) ──┐
                                   ├──► API REST (Flask) ──► SQLite
painel web (HTML/CSS/JS) ──────────┘          │
                                              └──► docxtpl ──► termos .docx
```

| Camada | Tecnologia | Pasta |
|---|---|---|
| API REST | Python, Flask, Flask-CORS | `gestao-dispositivos/src/api.py` |
| Banco de dados | SQLite (criado automaticamente na primeira execução) | `gestao-dispositivos/database/` |
| Painel web | HTML, CSS, JavaScript | `gestao-dispositivos/web/` |
| App mobile | React Native, Expo, TypeScript | `gestao-dispositivos/mobile/` |
| Documentos | python-docx / docxtpl | `gestao-dispositivos/documentos/` |

### Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| GET / POST | `/aparelhos` | lista / cadastra aparelhos |
| PUT / DELETE | `/aparelhos/<id>` | edita / remove um aparelho |
| GET / POST | `/colaboradores` | lista / cadastra colaboradores |
| GET | `/movimentacoes` | histórico de movimentações |
| POST | `/movimentacoes/saida` | registra a saída de um aparelho |
| POST | `/movimentacoes/devolucao` | registra a devolução |
| POST | `/gerar_termo` | gera o termo de saída (.docx) |
| POST | `/gerar_termo_devolucao` | gera o termo de devolução (.docx) |

## Como executar

**API + painel web**

```bash
pip install -r requirements.txt
python gestao-dispositivos/src/api.py
# acesse http://localhost:5000
```

**App mobile**

```bash
cd gestao-dispositivos/mobile
npm install
npx expo start
```

No app, ajuste a constante `API_URL` para o IP da máquina onde a API está rodando.

## Segurança e privacidade

- Banco de dados e modelos de documentos da empresa **não são versionados** (ver `.gitignore`). Para gerar termos, coloque seus próprios modelos `.docx` em `gestao-dispositivos/documentos/`.
- A API roda em modo de desenvolvimento (`debug=True`, sem autenticação). **Uso apenas em rede interna e ambiente de testes.** Próximos passos: autenticação, controle de acesso por perfil e logs de auditoria.

## Stack

Python · Flask · SQLite · docxtpl · React Native · Expo · TypeScript · HTML/CSS/JS
