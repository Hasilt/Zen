import { RequireAtLeastOne } from './type-pickers';

function createManyParams(list: any[]) {
  const result = list.reduce((accum: any[], item) => {
    const typeofItem = typeof item;

    if (typeofItem === 'object') {
      if (item.id !== null && item.id !== undefined && item.id !== '') {
        accum.push({ id: item.id });
      }
    } else if (typeofItem === 'number') {
      accum.push({ id: item });
    } else if (typeofItem === 'string') {
      if (item !== '') accum.push({ id: item });
    }

    return accum;
  }, []);

  if (result.length > 0) return result;
  else return undefined;
}

export function connectOne(
  item: RequireAtLeastOne<any, 'id'> | number | string | null | undefined
) {
  if (item !== undefined || item !== null) {
    const typeofItem = typeof item;

    if (
      typeofItem === 'object' &&
      (<any>item).id !== null &&
      (<any>item).id !== undefined &&
      (<any>item).id !== ''
    ) {
      return { connect: { id: (<any>item).id } };
    } else if (typeofItem === 'number') {
      return { connect: { id: item } };
    } else if (typeofItem === 'string') {
      if (item !== '') return { connect: { id: item } };
    }
  }

  return undefined;
}

export function connectMany(
  list:
    | Array<RequireAtLeastOne<any, 'id'> | null | undefined>
    | Array<number | null | undefined>
    | Array<string | null | undefined>
    | null
    | undefined
) {
  if (list) {
    const cleanedList = (list as any[]).filter(x => x !== null && x !== undefined);

    if (cleanedList.length > 0) {
      const result = createManyParams(cleanedList);
      if (result) return { connect: result };
    }
  }

  return undefined;
}

export function set(
  list:
    | Array<RequireAtLeastOne<any, 'id'> | null | undefined>
    | Array<number | null | undefined>
    | Array<string | null | undefined>
    | null
    | undefined
) {
  if (list) {
    const cleanedList = (list as any[]).filter(x => x !== null && x !== undefined);

    if (cleanedList.length > 0) {
      const result = createManyParams(cleanedList);
      if (result) return { set: result };
    }
  }

  return undefined;
}

export function disconnectMany(
  list:
    | Array<RequireAtLeastOne<any, 'id'> | null | undefined>
    | Array<number | null | undefined>
    | Array<string | null | undefined>
    | null
    | undefined
) {
  if (list) {
    const cleanedList = (list as any[]).filter(x => x !== null && x !== undefined);

    if (cleanedList.length > 0) {
      const result = createManyParams(cleanedList);
      if (result) return { disconnect: result };
    }
  }

  return undefined;
}