export interface Musica {
  id: string;
  titulo: string;
  autor: string;
  tom?: string;
  conteudo: string; // texto completo com cifras e letras
  criadaEm: number;
  alteradaEm: number;
}
