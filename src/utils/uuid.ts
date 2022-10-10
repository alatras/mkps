import { from as _uuidFrom, MUUID } from 'uuid-mongodb';
import { Binary } from 'mongodb';
import { UUIDParseError } from '../core/errors';

export const uuidFrom = (uuid: string | Binary): MUUID => {
  try {
    return _uuidFrom(uuid);
  } catch (e) {
    throw new UUIDParseError(`UUID: ${uuid}`, {
      field: 'UUID',
      value: uuid,
      description: e.message,
    });
  }
}
