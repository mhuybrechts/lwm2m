import Q from 'q'
import {CoapNode} from './CoapNode'
/**
 * This is the interface of Storage implementations. Any implementation should be a sub-class of this.
 */
export abstract class Storage {
  /**
   * Save device attributes and smart objects of a specific cnode to backend storage.
   * Cnode.`clientName` is used as PK.
   * All existing device attributes and smart objects of this cnode in backend storage will be replaced.
   * @param cnode This should be an instance of `CoapNode`.
   * @return Promise: resolved to device attributes and smart objects of the cnode.
   */
  abstract save(cnode: CoapNode): Q.Promise<any>

  /**
   * Load device attributes and smart objects of a specific cnode from backend storage.
   * Cnode.`clientName` is used as PK.
   * @param cnode This should be an instance of `CoapNode`.
   * @return Promise: resolved to device attributes and smart objects of the cnode.
   */
  abstract load(cnode: CoapNode): Q.Promise<any>

  /**
   * Load device attributes and smart objects of all cnodes from backend storage.
   * @return Promise: resolved to array of device attributes and smart objects of a cnode,
   * each item can be passed as the `devAttrs` argument to create a CoapNode.
   */
  abstract loadAll(): Q.Promise<any[]>

  /**
   * Remove device attributes and smart objects of a specific cnode from backend storage.
   * Cnode.`clientName` is used as PK.
   * @param cnode This should be an instance of `CoapNode`.
   * @return Promise: resolved to if device attributes and smart objects of the cnode is removed.
   */
  abstract remove(cnode: CoapNode): Q.Promise<any>

  /**
   * Update some device attributes of a specific cnode from backend storage.
   * Cnode.`clientName` is used as PK.
   * @param diff Properties NOT specified in `diff` will NOT be changed.
   * Properties specified in `diff` will be REPLACED as a whole part, this is different from `patchSo`.
   * @param cnode This should be an instance of `CoapNode`.
   * @return Promise: resolved to the passed in `diff` argument.
   */
  abstract updateAttrs(cnode: CoapNode, diff: Record<string, any>): Q.Promise<any>

  /**
   * Update some smart objects of a specific cnode from backend storage.
   * Cnode.`clientName` is used as PK.
   * @param diff Properties NOT specified in `diff` will NOT be changed.
   * Properties specified in `diff` will be PATCHED into existing smart objects, this is different from `updateAttrs`.
   * @param cnode This should be an instance of `CoapNode`
   * @return Promise: resolved to the passed in `diff` argument.
   */
  abstract patchSo(cnode: CoapNode, diff: Record<string, any>): Q.Promise<any>

  /**
   * Clear the whole backend storage, this will remove ALL device attributes and smart objects.
   * @return Promise: resolved to number of cnode infos removed from backend storage.
   */
  abstract reset(): Q.Promise<any>
}
