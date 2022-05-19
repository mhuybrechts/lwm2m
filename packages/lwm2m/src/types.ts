/***************************************************
 * Created by nanyuantingfeng on 2022/5/17 20:42. *
 ***************************************************/
export interface Callback<T = unknown> {
  (error: NodeJS.ErrnoException | null, data: T): void
  (error: NodeJS.ErrnoException | null, data: T, ...extra: any[]): void
}
