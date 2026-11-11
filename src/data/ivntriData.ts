export interface FashionProject {
  id: string;
  title: string;
  creator: string;
  creatorRole: string;
  year: string;
  category: 'EDITORIAL' | 'COUTURE' | 'LUXURY' | 'DIGITAL FASHION' | 'VIRTUAL MODELS' | 'CAMPAIGNS';
  aspectRatio: 'aspect-[3/4]' | 'aspect-[4/5]' | 'aspect-[16/9]' | 'aspect-square';
  coverImage: string;
  deck: string;
  synopsis: string;
  creativeProcess: string;
  aiTools: string[];
  credits: {
    creativeDirection: string;
    generativeDesign: string;
    textileSimulation?: string;
    soundDesign?: string;
  };
  gallery: {
    caption: string;
    image: string;
    aspect: string;
  }[];
  exhibitionNotes?: string;
}

export interface FilmProject {
  id: string;
  title: string;
  director: string;
  year: string;
  runtime: string;
  coverImage: string;
  synopsis: string;
  directorsStatement: string;
  genre: string;
  aiTools: string[];
  aspectRatio: string;
  credits: {
    director: string;
    screenplay: string;
    aiCinematography: string;
    neuralAudio: string;
    colorGrading: string;
  };
  stills: string[];
  festivalAccolades: string[];
  videoSrc?: string;
}

export interface ArtistProfile {
  id: string;
  name: string;
  discipline: 'AI FILMMAKER' | 'AI ARTIST' | 'DIGITAL DESIGNER' | 'CREATIVE DIRECTOR' | 'AI FASHION ARTIST';
  location: string;
  portrait: string;
  bio: string;
  manifestoQuote: string;
  selectedWorksCount: number;
  featuredWorkTitle: string;
  socialLinks: {
    instagram?: string;
    x?: string;
    website?: string;
  };
  exhibitions: string[];
}

export interface StudioProfile {
  id: string;
  name: string;
  city: string;
  focus: string;
  description: string;
  founded: string;
  notableClients: string[];
  coverImage: string;
}

export interface MagazineArticle {
  id: string;
  title: string;
  subtitle: string;
  category: 'AI CULTURE' | 'FASHION' | 'CINEMA' | 'TECHNOLOGY' | 'CREATIVE INDUSTRY' | 'INTERVIEWS' | 'ESSAYS';
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  coverImage: string;
  pullQuote: string;
  excerpt: string;
  paragraphs: string[];
  subheadings?: {
    title: string;
    content: string;
  }[];
}

export interface ArchivalEntry {
  accessionId: string;
  title: string;
  creator: string;
  category: string;
  date: string;
  image: string;
  medium: string;
}

import heroImg from '../assets/images/hero_cinematic_fashion_1790846436869.jpg';
import featureImg from '../assets/images/feature_after_human_1790846449884.jpg';
import coutureImg from '../assets/images/fashion_virtual_couture_1790846463606.jpg';
import filmImg from '../assets/images/film_synthetic_odyssey_1790846476563.jpg';
import portraitImg from '../assets/images/artist_editorial_portrait_1790846487949.jpg';
import runwayImg from '../assets/images/social_cinematic_runway_1790847135382.jpg';
import veilImg from '../assets/images/social_virtual_veil_1790847154978.jpg';

// Brand visual background for hero and design continuity
export const HERO_IMAGE = heroImg;
export const FEATURED_STORY_IMAGE = featureImg;
export const COUTURE_IMAGE = coutureImg;
export const FILM_STILL_IMAGE = filmImg;
export const ARTIST_PORTRAIT_IMAGE = portraitImg;
export const RUNWAY_IMAGE = runwayImg;
export const VEIL_IMAGE = veilImg;

// Real empty datasets — strictly powered by Firestore database
export const FASHION_PROJECTS: FashionProject[] = [];
export const FILM_PROJECTS: FilmProject[] = [];
export const ARTISTS: ArtistProfile[] = [];
export const STUDIOS: StudioProfile[] = [];
export const EDITORS_SELECTION: ArchivalEntry[] = [];
export const MAGAZINE_ARTICLES: MagazineArticle[] = [];
export const FEATURED_LEAD_STORY: MagazineArticle | null = null;
