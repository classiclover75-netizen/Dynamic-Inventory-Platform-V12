import mongoose from 'mongoose';
import { PageRow } from './server'; // oh wait, server.ts doesn't export PageRow.

// I'll make a standalone node script that loads mongoose, connects, finds Base64 in PageRow, and calls processRowImages? Wait, it's easier to just add an endpoint to server.ts or write it in server.ts and hit it or let import-zip do it.
