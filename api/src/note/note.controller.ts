import {
  Router, Response, NextFunction,
} from 'express';
import * as Y from 'yjs';
import { isValidObjectId } from 'mongoose';
import * as LRU from 'lru-cache';
import { Controller, WsController, WsContext } from '../interfaces/controller.interface';
import NoteModel from './note.model';
import validationMiddleware from '../middleware/validation.middleware';
import CreateNoteDto from './note.dto';
import NoteNotFoundException from '../exceptions/NoteNotFound';
import InvalidObjectIdException from '../exceptions/InvalidObjectIdException';
import {
  Note, PendingNote, pendingNote, saveContent,
} from './note.interface';
import broadcast from '../utils/ws';
import { stringToArray, Actions } from '../../../common/collab';
import authMiddleware from '../middleware/auth.middleware';
import RequestWithUser from '../interfaces/requestWithUser.interface';

class NoteController implements Controller, WsController {
  public path = '/note';

  public router = Router();

  private NoteModel = NoteModel;

  private noteCache: LRU<string, PendingNote | null>;

  constructor() {
    this.noteCache = new LRU({
      max: 100,
      maxAge: 60000,
      dispose: (_, note) => {
        saveContent(this.NoteModel, note);
      },
    });
    setInterval(() => {
      this.noteCache.forEach((note: PendingNote | null) => {
        saveContent(this.NoteModel, note);
      });
    }, 500);
    this.initialiseRoutes();
  }

  public subscribeToWs({ ws, wss }: WsContext): void {
    ws.on('contentUpdated', async (payload) => {
      if (!ws.isAuthenticated) {
        return;
      }
      const { id, mergeChanges } = payload;
      if (!isValidObjectId(id)) {
        console.error(new InvalidObjectIdException(id));
        return;
      }
      const note = await this.findNoteByIdAndToPending(id);
      if (note !== null) {
        const changes = stringToArray(mergeChanges);
        if (changes !== null) {
          Y.applyUpdate(note.content, changes, 'websocket');
          note.isDirty = true;
          broadcast(wss, JSON.stringify({
            action: Actions.CONTENT_UPDATED,
            payload: {
              id,
              mergeChanges,
            },
          }), {
            except: ws,
          });
        }
      }
    });
  }

  private initialiseRoutes() {
    this.router.get(this.path, authMiddleware, this.getAllNotes);
    this.router.post(`${this.path}/create`, authMiddleware, validationMiddleware(CreateNoteDto), this.createNote);
    this.router.patch(`${this.path}/:id`, authMiddleware, validationMiddleware(CreateNoteDto, true), this.editNote);
    this.router.get(`${this.path}/:id`, authMiddleware, this.getNoteById);
    this.router.delete(`${this.path}/:id`, authMiddleware, this.deleteNote);
  }

  private createNote = async (request: RequestWithUser, response: Response) => {
    const postData: CreateNoteDto = request.body;
    const createdNote = new this.NoteModel({
      ...postData,
      author: request.user._id,
      created: Date.now(),
      updated: Date.now(),
    });
    const savedNote = await createdNote.save();
    response.send(savedNote);
  };

  private getAllNotes = async (request: RequestWithUser, response: Response) => {
    const notes = await this.NoteModel.find({
      author: request.user._id,
    });
    response.send(notes);
  };

  private getNoteById = async (request: RequestWithUser, response: Response,
    next: NextFunction) => {
    const { id } = request.params;
    if (!isValidObjectId(id)) {
      next(new InvalidObjectIdException(id));
      return;
    }
    const note = await this.NoteModel.findOne({ _id: id, author: request.user._id });
    if (note !== null) {
      response.send(note);
    } else {
      next(new NoteNotFoundException(id));
    }
  };

  private editNote = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const { id } = request.params;
    const data: Note = request.body;
    if (!isValidObjectId(id)) {
      next(new InvalidObjectIdException(id));
      return;
    }
    const note = await this.NoteModel.findOneAndUpdate({
      _id: id,
      author: request.user._id,
    }, data, { new: true });
    if (note !== null) {
      response.send(note);
    } else {
      next(new NoteNotFoundException(id));
    }
  };

  private deleteNote = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const { id } = request.params;
    if (!isValidObjectId(id)) {
      next(new InvalidObjectIdException(id));
      return;
    }
    if (await this.NoteModel.findOneAndDelete({ _id: id, author: request.user._id }) !== null) {
      response.send({
        _id: id,
        status: 200,
      });
    } else {
      next(new NoteNotFoundException(id));
    }
  };

  private findNoteByIdAndToPending = async (id: string): Promise<PendingNote | null> => {
    if (this.noteCache.has(id)) {
      return this.noteCache.get(id) || null;
    }
    const note = pendingNote(await this.NoteModel.findById(id));
    this.noteCache.set(id, note);
    return note;
  };
}

export default NoteController;
