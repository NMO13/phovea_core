/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */
/**
 * Created by Samuel Gratzl on 04.08.2014.
 */

import {mixin} from '../index';
import {Range, RangeLike} from '../range';
import {IDType} from '../idtype';
import {IDataType, IValueType, IValueTypeDesc, IDataDescription, createDefaultDataDesc} from '../datatype';
import {IVector} from '../vector';
import {IAnyVector} from '../vector/IVector';

export interface IQueryArgs {
  [key: string]: number|string;
}

export interface ITableColumn<D extends IValueTypeDesc> {
  name: string;
  description?: string;
  value: D;
  getter?(row: any): any;
}

export declare type IAnyTableColumn = ITableColumn<any>;

/**
 * The description, i.e., the metadata for the table (name, idtype, etc.)
 */
export interface ITableDataDescription extends IDataDescription {
  readonly idtype: string;
  readonly size: number[];
  readonly columns: IAnyTableColumn[];
}

/**
 * A table is a data structure made up of rows and columns. In a table, the elements within a column are always
 * of the same data type; the data types between different columns can vary. For example, the first column in a
 * table can be categorical, the second can be integers, the third can be IDs, etc.
 *
 * If your columns are of the same type, use Matrix instead.
 */
export interface ITable extends IDataType {
  readonly desc: ITableDataDescription;

  readonly ncol: number;
  readonly nrow: number;

  /**
   * id type
   */
  readonly idtype: IDType;

  /**
   * returns the chosen columns
   * @param range optional subset
   */
  cols(range?: RangeLike): IAnyVector[];

  /**
   * return the specific column
   * @param i
   */
  col<T, D extends IValueTypeDesc>(i: number): IVector<T, D>;

  /**
   * returns the row names
   * returns a promise for getting the row names of the matrix
   * @param range optional subset
   */
  rows(range?: RangeLike): Promise<string[]>;
  /**
   * returns the row ids
   * @param range optional subset
   */
  rowIds(range?: RangeLike): Promise<Range>;

  /**
   * Creates a new view on this table specified by the given range. A view implements the ITable interface yet is still
   * backed by the data from the original table.
   *
   * @param range
   */
  view(range?: RangeLike): ITable;

  queryView(name: string, args: IQueryArgs): ITable;

  idView(idRange?: RangeLike): Promise<ITable>;

  /**
   * reduces the current matrix to a vector using the given reduce function
   * @param f the reduce function
   * @param this_f the this context for the function default the matrix
   * @param valuetype the new value type by default the same as matrix valuetype
   * @param idtype the new vlaue type by default the same as matrix rowtype
   */
  reduce<T, D extends IValueTypeDesc>(f: (row: any[]) => T, thisArgument?: any, valuetype?: D, idtype?: IDType): IVector<T, D>;
  /**
   * returns a promise for getting one cell
   * @param i
   * @param j
   */
  at(i: number, j: number): Promise<IValueType>;
  /**
   * returns a promise for getting the data as two dimensional array
   * @param range
   */
  data(range?: RangeLike): Promise<IValueType[][]>;

  /**
   * Returns the data of the named column as an array with the data
   * @param column the name of the column to retrieve the data from
   * @param range a range operator; optional
   */
  colData<T>(column: string, range?: RangeLike): Promise<T[]>;

  /**
   * returns a promise for getting the data as an array of objects
   * @param range
   */
  objects(range?: RangeLike): Promise<any[]>;
}

export default ITable;


export function createDefaultTableDesc(): ITableDataDescription {
  return <ITableDataDescription>mixin(createDefaultDataDesc(), {
    type: 'table',
    idtype: '_rows',
    columns: [],
    size: [0, 0]
  });
}
