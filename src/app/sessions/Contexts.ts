"use client";
import { User } from '@clerk/nextjs/server';
import { createContext } from 'react';

export const ClubContext = createContext<string>('');
export const UserContext = createContext<string | undefined>('');