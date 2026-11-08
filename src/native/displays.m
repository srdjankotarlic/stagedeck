#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#import <CoreGraphics/CoreGraphics.h>
static NSArray *capture(void) {
  uint32_t count=0; CGGetOnlineDisplayList(0,NULL,&count);
  CGDirectDisplayID *ids=calloc(count,sizeof(CGDirectDisplayID));
  CGGetOnlineDisplayList(count,ids,&count); NSMutableArray *frames=[NSMutableArray array];
  for(uint32_t i=0;i<count;i++){
    CGRect b=CGDisplayBounds(ids[i]);CGDisplayModeRef mode=CGDisplayCopyDisplayMode(ids[i]);
    [frames addObject:@{@"id":@(ids[i]),@"x":@((int)b.origin.x),@"y":@((int)b.origin.y),@"width":@((int)b.size.width),@"height":@((int)b.size.height),@"mirror":@(CGDisplayMirrorsDisplay(ids[i])),@"mode":@(mode?CGDisplayModeGetIODisplayModeID(mode):0),@"main":@(CGDisplayIsMain(ids[i])),@"internal":@(CGDisplayIsBuiltin(ids[i]))}];if(mode)CGDisplayModeRelease(mode);
  }
  free(ids);return frames;
}
static BOOL online(CGDirectDisplayID id){return CGDisplayIsOnline(id);}
static BOOL apply(NSArray *frames,BOOL restore) {
  CGDisplayConfigRef config=NULL;
  if(CGBeginDisplayConfiguration(&config)!=kCGErrorSuccess)return NO;
  // Reset cloning before rebuilding groups. Origins and modes are restored atomically.
  for(NSDictionary *f in frames){CGDirectDisplayID id=[f[@"id"] unsignedIntValue];if(!online(id))continue;
    if(CGConfigureDisplayMirrorOfDisplay(config,id,kCGNullDirectDisplay)!=kCGErrorSuccess){CGCancelDisplayConfiguration(config);return NO;}}
  for(NSDictionary *f in frames){CGDirectDisplayID id=[f[@"id"] unsignedIntValue];if(!online(id))continue;
    if(restore&&f[@"mode"]){CFArrayRef modes=CGDisplayCopyAllDisplayModes(id,NULL);if(modes){for(CFIndex j=0;j<CFArrayGetCount(modes);j++){CGDisplayModeRef mode=(CGDisplayModeRef)CFArrayGetValueAtIndex(modes,j);if(CGDisplayModeGetIODisplayModeID(mode)==[f[@"mode"] unsignedIntValue]){CGConfigureDisplayWithDisplayMode(config,id,mode,NULL);break;}}CFRelease(modes);}}
    if(CGConfigureDisplayOrigin(config,id,[f[@"x"] intValue],[f[@"y"] intValue])!=kCGErrorSuccess){CGCancelDisplayConfiguration(config);return NO;}
  }
  for(NSDictionary *f in frames){CGDirectDisplayID id=[f[@"id"] unsignedIntValue],master=[f[@"mirror"] unsignedIntValue];if(!online(id)||!master||!online(master))continue;
    CGError mirrorError=CGConfigureDisplayMirrorOfDisplay(config,id,master);if(mirrorError!=kCGErrorSuccess){fprintf(stderr,"Mirror %u -> %u failed (%d)\n",id,master,mirrorError);CGCancelDisplayConfiguration(config);return NO;}}
  CGError completeError=CGCompleteDisplayConfiguration(config,kCGConfigureForSession);if(completeError)fprintf(stderr,"Display commit failed (%d)\n",completeError);return completeError==kCGErrorSuccess;
}
int main(int argc,const char *argv[]){@autoreleasepool{
  if(argc<3)return 1;
  NSString *operation=@(argv[1]),*file=@(argv[2]);NSFileManager *fm=[NSFileManager defaultManager];BOOL ok=YES;
  if([operation isEqualToString:@"restore"]){
    if([fm fileExistsAtPath:file]){NSArray *frames=[NSJSONSerialization JSONObjectWithData:[NSData dataWithContentsOfFile:file] options:0 error:NULL];ok=[frames isKindOfClass:[NSArray class]]&&apply(frames,YES);if(ok)[fm removeItemAtPath:file error:NULL];}
  }else if([operation isEqualToString:@"prepare"]&&argc==4){
    CGDirectDisplayID control=(CGDirectDisplayID)strtoul(argv[3],NULL,10);NSArray *frames=capture();NSDictionary *target=nil;
    for(NSDictionary *f in frames)if([f[@"id"] unsignedIntValue]==control)target=f;
    if(!target)ok=NO;
    else if(control!=CGMainDisplayID()){
      if(![fm fileExistsAtPath:file]){NSData *saved=[NSJSONSerialization dataWithJSONObject:frames options:0 error:NULL];ok=[saved writeToFile:file options:NSDataWritingAtomic error:NULL];}
      if(ok){NSMutableArray *shifted=[NSMutableArray array];for(NSDictionary *f in frames){NSMutableDictionary *next=[f mutableCopy];next[@"x"]=@([f[@"x"] intValue]-[target[@"x"] intValue]);next[@"y"]=@([f[@"y"] intValue]-[target[@"y"] intValue]);[shifted addObject:next];}ok=apply(shifted,NO);}
    }
  }else if(![operation isEqualToString:@"status"])ok=NO;
  if(!ok){fprintf(stderr,"Izabrani raspored monitora nije podržan ili ga sistem nije primenio.\n");return 1;}
  NSMutableArray *ids=[NSMutableArray array];for(NSScreen *s in [NSScreen screens])[ids addObject:s.deviceDescription[@"NSScreenNumber"]];
  NSData *result=[NSJSONSerialization dataWithJSONObject:@{@"ok":@YES,@"displayIds":ids,@"physical":capture()} options:0 error:NULL];puts([[NSString alloc] initWithData:result encoding:NSUTF8StringEncoding].UTF8String);
}return 0;}
