import { RequestHandler } from 'express';
import { Document } from 'mongoose';
import { Note } from '../note/note.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { authMiddleware } from './auth.middleware';
import { User } from '../user/user.interface';
import NoPermissionException from '../exceptions/NoPermissionException';
import { Permission, Visibility } from '../share/share.interface';
import NoteModel from '../note/note.model';
import NoteNotFoundException from '../exceptions/NoteNotFound';

async function getUserPermission(user: User & Document, note: Note & Document)
  : Promise<[boolean, Permission]> {
  const visibility = note.visibility || Visibility.Private;
  if (visibility === Visibility.Private) {
    return [`${user._id}` === note.author, Permission.Write];
  }
  if (visibility === Visibility.Users) {
    await note.populate({
      path: 'sharedUsers',
      match: {
        user: user._id,
      },
    }).execPopulate();
    if (note.sharedUsers === undefined) {
      return [false, Permission.Read];
    }
    const userPermission = note.sharedUsers
      .find((sharedUser) => {
        const id = typeof sharedUser.user !== 'string'
          ? `${sharedUser.user._id}` : sharedUser.user;
        return id === `${user._id}`;
      });
    if (userPermission === undefined) {
      return [false, Permission.Read];
    }
    return [true, userPermission.permission];
  }
  return [visibility === Visibility.AnyOneWithLink, Permission.Write];
}

function visiMiddleware(): RequestHandler[] {
  return [
    authMiddleware,
    async (req: RequestWithUser, _, next) => {
      const { id } = req.params;
      const note = await NoteModel.findById(id);
      if (note === null) {
        next(new NoteNotFoundException(id));
        return;
      }
      const [haveAccess] = await getUserPermission(req.user, note);
      if (!haveAccess) {
        next(new NoPermissionException());
        return;
      }
      next();
    },
  ];
}

export default visiMiddleware;
