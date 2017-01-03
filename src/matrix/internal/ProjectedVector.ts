/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */
/**
 * Created by Samuel Gratzl on 04.08.2014.
 */

import {argSort, argFilter} from '../../index';
import {list as rlist, RangeLike, parse} from '../../range';
import {IValueType} from '../../datatype';
import {IVector, IVectorDataDescription} from '../../vector';
import AVector from '../../vector/AVector';
import {IMatrix} from '../IMatrix';

/**
 * a simple projection of a matrix columns to a vector
 */
export default class ProjectedVector extends AVector implements IVector {
  readonly desc: IVectorDataDescription;

  constructor(private m: IMatrix, private f: (row: IValueType[]) => any, private this_f = m, public readonly valuetype = m.valuetype, private _idtype = m.rowtype) {
    super(null);
    this.desc = {
      name: m.desc.name + '-p',
      fqname: m.desc.fqname + '-p',
      type: 'vector',
      id: m.desc.id + '-p',
      size: this.dim[0],
      idtype: m.rowtype,
      value: this.valuetype,
      description: m.desc.description,
      creator: m.desc.creator,
      ts: m.desc.ts
    };
    this.root = this;
  }

  persist() {
    return {
      root: this.m.persist(),
      f: this.f.toString(),
      valuetype: this.valuetype === this.m.valuetype ? undefined : this.valuetype,
      idtype: this.idtype === this.m.rowtype ? undefined : this.idtype.name
    };
  }

  restore(persisted: any) {
    let r: IVector = this;
    if (persisted && persisted.range) { //some view onto it
      r = r.view(parse(persisted.range));
    }
    return r;
  }

  get idtype() {
    return this._idtype;
  }

  get idtypes() {
    return [this._idtype];
  }

  size() {
    return this.m.nrow;
  }

  /**
   * return the associated ids of this vector
   */
  names(range?: RangeLike): Promise<string[]> {
    return this.m.rows(range);
  }

  ids(range?: RangeLike) {
    return this.m.rowIds(range);
  }

  /**
   * returns a promise for getting one cell
   * @param i
   */
  at(i: number): Promise<IValueType> {
    return this.m.data(rlist(i)).then((d) => {
      return this.f.call(this.this_f, d[0]);
    });
  }

  /**
   * returns a promise for getting the data as two dimensional array
   * @param range
   */
  data(range?: RangeLike): Promise<IValueType[]> {
    return this.m.data(range).then((d) => {
      return d.map(this.f, this.this_f);
    });
  }

  sort(compareFn?: (a: IValueType, b: IValueType) => number, thisArg?: any): Promise<IVector> {
    return this.data().then((d) => {
      const indices = argSort(d, compareFn, thisArg);
      return this.view(rlist(indices));
    });
  }

  filter(callbackfn: (value: IValueType, index: number) => boolean, thisArg?: any): Promise<IVector> {
    return this.data().then((d) => {
      const indices = argFilter(d, callbackfn, thisArg);
      return this.view(rlist(indices));
    });
  }
}