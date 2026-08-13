import { useState, useEffect, useCallback } from 'react';
import { Musica } from './types';

// -------------------------------------------------------------
// Constantes e armazenamento
// -------------------------------------------------------------
const STORAGE_KEY = 'cifras-espiritas-musicas';

function carregarMusicas(): Musica[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silencioso */ }
  return [
    {
      id: 'joanna-caminhos-do-coracao',
      titulo: 'Caminhos do Coração',
      autor: 'Joanna (Pessoa = Pessoas)',
      tom: 'C',
      conteudo: `[Intro] G#7  G7

         C                     C7M
Há muito tempo que eu saí de casa
         C7                       F7M 
Há muito tempo que eu caí na estrada
         Bm7(5-)        E7(9-)   Am7
Há muito tempo que eu estou na vida
                 D7
Foi assim que eu quis
                 G7
E assim eu sou feliz
         Dm7                Dm7M
Principalmente por poder voltar
                   Dm6 
A todos os lugares onde já cheguei
           Dm7               Dm7M
Pois lá deixei um prato de comida
           Dm6
Um abraço amigo
     Dm7              G7
E um canto dormir e sonhar
     C                    C7M
Aprendi que se depende sempre
         C7                 F7M
De tanta muita diferente gente
       Bm7(5-)     E7(9-)  Am7
Toda pessoa sempre é as marcas
             D7                       G7
Das lições diárias de outras tantas pessoas
          Dm7                   Dm7M
E é tão bonito quando a gente entende
                    Dm6
Que a gente é tanta gente
                      Dm7
Onde quer que a gente vá
                            Dm7M
É tão bonito quanto a gente sente
                 Dm6
Que nunca está sozinho
    Dm7              G7
Por mais que pense estar
      C             G/B        Am7
Tão bonito quando a gente pisa firme
       C7           F7M
Nessas linhas que estão
           G7        C7M  E7
Nas palmas de nossas mãos
        F7M           E7            Am7
É tão bonito quando a gente vai à vida
                  D7
Nos caminhos onde bate
                     Dm7  G7
Bem mais forte o coração, óh!
          C             G/B        Am7
E é tão bonito quando a gente pisa firme
       C7           F7M
Nessas linhas que estão
           G7        C7M  E7
Nas palmas de nossas mãos
        F7M           E7            Am7
É tão bonito quando a gente vai à vida
                  D7
Nos caminhos onde bate
         G7      C   
Bem mais forte o coração
Bb    F7M      
O coração
Bb        C
Ah! O coração`,
      criadaEm: Date.now(),
      alteradaEm: Date.now(),
    },
  ];
}

function salvarMusicas(musicas: Musica[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(musicas));
  } catch { /* silencioso */ }
}

// -------------------------------------------------------------
// Utilidades musicais
// -------------------------------------------------------------
const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface AcordeParse {
  root: string;
  sufixo: string;
  bass?: string;
}

function parseAcorde(token: string): AcordeParse | null {
  const match = token.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!match) return null;
  let [, root, accidental, rest] = match;
  root = root.toUpperCase();
  const rootNote = root + accidental;

  let bass: string | undefined;
  if (rest.includes('/')) {
    const partes = rest.split('/');
    rest = partes[0];
    bass = partes[1];
  }

  return {
    root: rootNote,
    sufixo: rest,
    bass,
  };
}

function transporRoot(root: string, semitons: number): string {
  const flatSharpMap: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  };
  const normal = flatSharpMap[root] || root;
  const idx = NOTAS.indexOf(normal);
  if (idx === -1) return root;
  const novoIdx = ((idx + semitons) % 12 + 12) % 12;
  return NOTAS[novoIdx];
}

function transporAcorde(token: string, semitons: number): string {
  if (semitons === 0) return token;
  const parsed = parseAcorde(token);
  if (!parsed) return token;
  let novoToken = transporRoot(parsed.root, semitons) + parsed.sufixo;
  if (parsed.bass) {
    const bassParsed = parseAcorde(parsed.bass);
    if (bassParsed) {
      novoToken += '/' + transporRoot(bassParsed.root, semitons) + bassParsed.sufixo;
    } else {
      novoToken += '/' + parsed.bass;
    }
  }
  return novoToken;
}

function isAcordeToken(token: string): boolean {
  if (!token) return false;
  const limpo = token.replace(/[()\d,./#b]/g, '');
  if (limpo.length > 8) return false;
  if (!/^[A-Ga-g]/.test(token)) return false;
  const rest = token.slice(1);
  if (/[a-su-z]/.test(rest)) return false;
  return /^[A-Ga-g][#b]?[A-Za-z0-9#()*+°/-]*$/.test(token);
}

function ehLinhaDeAcordes(linha: string): boolean {
  const tokens = linha.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const acordes = tokens.filter(t => isAcordeToken(t));
  if (acordes.length === 0) return false;
  if (linha.trim().startsWith('[')) return true;
  const densidade = acordes.length / tokens.length;
  return densidade >= 0.5;
}

function transporTexto(texto: string, semitons: number): string {
  if (semitons === 0) return texto;
  return texto.split('\n').map(linha => {
    if (!ehLinhaDeAcordes(linha)) return linha;

    const regex = /([A-Ga-g][#b]?[A-Za-z0-9#()*+°/-]*)/g;
    const matches: { start: number; end: number; token: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(linha)) !== null) {
      const token = m[1];
      if (isAcordeToken(token)) {
        matches.push({ start: m.index, end: m.index + token.length, token });
      }
    }

    let nova = linha;
    for (let i = matches.length - 1; i >= 0; i--) {
      const { start, end, token } = matches[i];
      const transposto = transporAcorde(token, semitons);
      if (transposto !== token) {
        nova = nova.slice(0, start) + transposto + nova.slice(end);
      }
    }
    return nova;
  }).join('\n');
}

// -------------------------------------------------------------
// Componente principal
// -------------------------------------------------------------
function App() {
  const [musicas, setMusicas] = useState<Musica[]>(carregarMusicas);
  const [selecionada, setSelecionada] = useState<Musica | null>(null);
  const [modo, setModo] = useState<'lista' | 'ver' | 'editar' | 'nova'>('lista');
  const [semitons, setSemitons] = useState(0);
  const [formTitulo, setFormTitulo] = useState('');
  const [formAutor, setFormAutor] = useState('');
  const [formTom, setFormTom] = useState('');
  const [formConteudo, setFormConteudo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    salvarMusicas(musicas);
  }, [musicas]);

  const abrirMusica = useCallback((musica: Musica) => {
    setSelecionada(musica);
    setModo('ver');
    setSemitons(0);
  }, []);

  const voltarParaLista = () => {
    setModo('lista');
    setSelecionada(null);
  };

  const abrirEditorNova = () => {
    setEditingId(null);
    setFormTitulo('');
    setFormAutor('');
    setFormTom('');
    setFormConteudo('');
    setModo('nova');
  };

  const abrirEditorEditar = (musica: Musica) => {
    setEditingId(musica.id);
    setFormTitulo(musica.titulo);
    setFormAutor(musica.autor);
    setFormTom(musica.tom || '');
    setFormConteudo(musica.conteudo);
    setModo('editar');
  };

  const salvarFormulario = () => {
    if (!formTitulo.trim() || !formConteudo.trim()) {
      alert('Preencha ao menos o título e o conteúdo da música.');
      return;
    }

    if (editingId) {
      setMusicas(prev => prev.map(m =>
        m.id === editingId
          ? { ...m, titulo: formTitulo, autor: formAutor, tom: formTom, conteudo: formConteudo, alteradaEm: Date.now() }
          : m
      ));
    } else {
      const nova: Musica = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        titulo: formTitulo,
        autor: formAutor,
        tom: formTom,
        conteudo: formConteudo,
        criadaEm: Date.now(),
        alteradaEm: Date.now(),
      };
      setMusicas(prev => [...prev, nova]);
    }
    setModo('lista');
  };

  const excluirMusica = (id: string) => {
    if (confirm('Excluir esta música?')) {
      setMusicas(prev => prev.filter(m => m.id !== id));
    }
  };

  const exportarBackupGeral = () => {
    const blob = new Blob([JSON.stringify(musicas, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cifras-espiritas-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarTxtGeral = () => {
    const texto = musicas.map(musica => {
      const tom = musica.tom ? `Tom: ${musica.tom}\n` : '';
      return `${musica.titulo} - ${musica.autor}\n${tom}\n${musica.conteudo}\n\n=====\n\n`;
    }).join('');
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cifras-espiritas.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarMusicaTxt = (musica: Musica) => {
    const texto = transporTexto(musica.conteudo, semitons);
    const tom = musica.tom ? `Tom original: ${musica.tom}\n` : '';
    const cabecalho = `${musica.titulo} - ${musica.autor}\n${tom}${texto}\n`;
    const blob = new Blob([cabecalho], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${musica.titulo.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarMusicaJson = (musica: Musica) => {
    const texto = transporTexto(musica.conteudo, semitons);
    const dados = { ...musica, conteudo: texto };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${musica.titulo.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importarBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dados = JSON.parse(e.target?.result as string);
        if (Array.isArray(dados) && dados.every((d: any) => d.id && d.titulo && d.conteudo)) {
          setMusicas(dados);
          alert('Backup importado com sucesso!');
        } else {
          alert('Arquivo inválido.');
        }
      } catch {
        alert('Erro ao ler o arquivo.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // -----------------------------------------------------------
  // Tela de visualização da música
  // -----------------------------------------------------------
  if (modo === 'ver' && selecionada) {
    const textoTransposto = transporTexto(selecionada.conteudo, semitons);

    return (
      <div className="pagina">
        <div className="barra-superior">
          <button className="btn-voltar" onClick={voltarParaLista}>← Voltar</button>
          <h2>{selecionada.titulo}</h2>
          <p className="autor">{selecionada.autor}</p>
          {selecionada.tom && (
            <p className="tom-original">Tom original: <strong>{selecionada.tom}</strong></p>
          )}
          <div className="botoes-transposicao">
            <button className="btn-tom" onClick={() => setSemitons(s => s - 1)}>Tom-</button>
            <span className="tom-atual">{semitons > 0 ? `+${semitons}` : semitons}</span>
            <button className="btn-tom" onClick={() => setSemitons(s => s + 1)}>Tom+</button>
          </div>
        </div>
        <div className="conteudo-cifra">
          <pre>{textoTransposto}</pre>
        </div>
        <div className="barra-inferior">
          <button className="btn-editar" onClick={() => abrirEditorEditar(selecionada)}>✏️ Editar</button>
          <button className="btn-exportar-musica" onClick={() => exportarMusicaTxt(selecionada)}>📄 TXT</button>
          <button className="btn-exportar-musica" onClick={() => exportarMusicaJson(selecionada)}>💾 JSON</button>
          <button className="btn-excluir" onClick={() => { if (confirm('Excluir esta música?')) { excluirMusica(selecionada.id); voltarParaLista(); } }}>🗑️ Excluir</button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // Telas de edição (nova ou editar)
  // -----------------------------------------------------------
  if (modo === 'nova' || modo === 'editar') {
    return (
      <div className="pagina">
        <div className="form-container">
          <h2>{modo === 'nova' ? 'Nova Música' : 'Editar Música'}</h2>
          <label className="campo">
            Título:
            <input type="text" value={formTitulo} onChange={e => setFormTitulo(e.target.value)} />
          </label>
          <label className="campo">
            Autor:
            <input type="text" value={formAutor} onChange={e => setFormAutor(e.target.value)} />
          </label>
          <label className="campo">
            Tom (opcional):
            <input type="text" value={formTom} onChange={e => setFormTom(e.target.value)} placeholder="Ex: C, G, Em..." />
          </label>
          <label className="campo">
            Cifra (texto):
            <textarea
              value={formConteudo}
              onChange={e => setFormConteudo(e.target.value)}
              rows={20}
              placeholder="Cole aqui a letra com as cifras..."
            />
          </label>
          <div className="form-acoes">
            <button className="btn-salvar" onClick={salvarFormulario}>Salvar</button>
            <button className="btn-cancelar" onClick={voltarParaLista}>Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // Tela de lista de músicas
  // -----------------------------------------------------------
  return (
    <div className="pagina">
      <div className="header-lista">
        <h1>Cifras Espíritas</h1>
        <p className="subtitulo">Toque em uma música para abrir</p>
      </div>

      <div className="acoes-lista">
        <button className="btn-nova-musica" onClick={abrirEditorNova}>➕ Nova Música</button>
        <button className="btn-exportar" onClick={exportarBackupGeral}>💾 Exportar JSON</button>
        <button className="btn-exportar-txt" onClick={exportarTxtGeral}>📄 Exportar TXT</button>
        <label className="btn-importar">
          📂 Importar backup
          <input type="file" accept=".json" onChange={importarBackup} hidden />
        </label>
      </div>

      <div className="lista-musicas">
        {musicas.map(musica => (
          <div key={musica.id} className="item-musica" onClick={() => abrirMusica(musica)}>
            <div className="info-musica">
              <strong>{musica.titulo}</strong>
              <small>{musica.autor}{musica.tom ? ` • Tom: ${musica.tom}` : ''}</small>
            </div>
            <div className="acoes-item">
              <button className="btn-editar-item" onClick={(e) => { e.stopPropagation(); abrirEditorEditar(musica); }}>✏️</button>
              <button className="btn-excluir-item" onClick={(e) => { e.stopPropagation(); excluirMusica(musica.id); }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
