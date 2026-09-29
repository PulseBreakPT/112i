import { useCallback, useMemo, useRef, useState } from 'react';

export function useVirtualList(total,{itemHeight=156,overscan=6}={}){
  const containerRef=useRef(null);
  const [scrollTop,setScrollTop]=useState(0);
  const [height,setHeight]=useState(640);
  const onScroll=useCallback(event=>{
    setScrollTop(event.currentTarget.scrollTop);
    setHeight(event.currentTarget.clientHeight||640);
  },[]);
  return useMemo(()=>{
    const visible=Math.ceil(height/itemHeight);
    const start=Math.max(0,Math.floor(scrollTop/itemHeight)-overscan);
    const end=Math.min(total,start+visible+overscan*2);
    return {containerRef,onScroll,start,end,paddingTop:start*itemHeight,paddingBottom:Math.max(0,(total-end)*itemHeight)};
  },[height,itemHeight,onScroll,overscan,scrollTop,total]);
}