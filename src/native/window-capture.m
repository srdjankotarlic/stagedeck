#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#import <ScreenCaptureKit/ScreenCaptureKit.h>
#import <CoreMedia/CoreMedia.h>
#import <CoreImage/CoreImage.h>
#import <ImageIO/ImageIO.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
static dispatch_queue_t outputQueue;
static NSMutableArray *streams;
static void sendJSON(NSDictionary *object){NSData *data=[NSJSONSerialization dataWithJSONObject:object options:0 error:NULL];if(!data)return;@synchronized(streams){fwrite(data.bytes,1,data.length,stdout);fputc('\n',stdout);fflush(stdout);}}
@interface FrameSink:NSObject<SCStreamOutput,SCStreamDelegate>
@property NSString *role;
@property CIContext *context;
@property NSUInteger frames;
@end
@implementation FrameSink
-(void)stream:(SCStream *)stream didStopWithError:(NSError *)error{sendJSON(@{@"error":error.localizedDescription?:@"PowerPoint capture stopped"});}
-(void)stream:(SCStream *)stream didOutputSampleBuffer:(CMSampleBufferRef)sample ofType:(SCStreamOutputType)type{
 if(type!=SCStreamOutputTypeScreen||!CMSampleBufferIsValid(sample))return;
 CVImageBufferRef pixel=CMSampleBufferGetImageBuffer(sample);if(!pixel)return;
 @autoreleasepool{
  CIImage *image=[CIImage imageWithCVPixelBuffer:pixel];CGImageRef cg=[self.context createCGImage:image fromRect:image.extent];if(!cg)return;
  NSMutableData *jpeg=[NSMutableData data];CGImageDestinationRef destination=CGImageDestinationCreateWithData((__bridge CFMutableDataRef)jpeg,(__bridge CFStringRef)UTTypeJPEG.identifier,1,NULL);
  if(destination){CGImageDestinationAddImage(destination,cg,(__bridge CFDictionaryRef)@{(__bridge NSString *)kCGImageDestinationLossyCompressionQuality:@0.85});CGImageDestinationFinalize(destination);CFRelease(destination);
   sendJSON(@{@"role":self.role,@"width":@(CGImageGetWidth(cg)),@"height":@(CGImageGetHeight(cg)),@"sequence":@(++self.frames),@"jpeg":[jpeg base64EncodedStringWithOptions:0]});}
  CGImageRelease(cg);
 }
}
@end
int main(int argc,const char *argv[]){@autoreleasepool{
 [NSApplication sharedApplication];[NSApp setActivationPolicy:NSApplicationActivationPolicyProhibited];
 if(argc<3)return 1;NSString *name=[@(argv[1]) precomposedStringWithCanonicalMapping].lowercaseString;NSArray *roles=[@(argv[2]) componentsSeparatedByString:@","];
 outputQueue=dispatch_queue_create("com.stagedeck.capture-frames",DISPATCH_QUEUE_SERIAL);streams=[NSMutableArray array];NSMutableArray *sinks=[NSMutableArray array];
 [SCShareableContent getShareableContentExcludingDesktopWindows:YES onScreenWindowsOnly:NO completionHandler:^(SCShareableContent *content,NSError *error){
  if(error){sendJSON(@{@"error":error.localizedDescription});exit(2);}
  for(NSString *role in roles){SCWindow *source=nil;
   for(SCWindow *window in content.windows){if(![window.owningApplication.bundleIdentifier.lowercaseString isEqualToString:@"com.microsoft.powerpoint"])continue;
    NSString *title=[[window.title precomposedStringWithCanonicalMapping].lowercaseString stringByReplacingOccurrencesOfString:@" [compatibility mode]" withString:@""];
    if(![title containsString:[NSString stringWithFormat:@"[%@]",name]])continue;
    if(([role isEqualToString:@"notes"]&&[title containsString:@"presenter view"])||([role isEqualToString:@"slides"]&&[title containsString:@"slide show"])){source=window;break;}}
   if(!source){sendJSON(@{@"error":[NSString stringWithFormat:@"PowerPoint %@ window not found",role]});exit(3);}
   SCContentFilter *filter=[[SCContentFilter alloc] initWithDesktopIndependentWindow:source];
   SCStreamConfiguration *config=[[SCStreamConfiguration alloc] init];CGFloat width=source.frame.size.width,height=source.frame.size.height;CGFloat scale=MIN(1.0,1920.0/MAX(width,1));
   config.width=(size_t)round(width*scale);config.height=(size_t)round(height*scale);config.minimumFrameInterval=CMTimeMake(1,30);config.queueDepth=3;config.showsCursor=NO;config.pixelFormat=kCVPixelFormatType_32BGRA;
   if(@available(macOS 14.0,*)){config.ignoreShadowsSingleWindow=YES;config.shouldBeOpaque=YES;}
   FrameSink *sink=[[FrameSink alloc] init];sink.role=role;sink.context=[CIContext contextWithOptions:@{kCIContextUseSoftwareRenderer:@NO}];[sinks addObject:sink];
   SCStream *stream=[[SCStream alloc] initWithFilter:filter configuration:config delegate:sink];[streams addObject:stream];
   NSError *addError=nil;if(![stream addStreamOutput:sink type:SCStreamOutputTypeScreen sampleHandlerQueue:outputQueue error:&addError]){sendJSON(@{@"error":addError.localizedDescription});exit(4);}
   sendJSON(@{@"source":role,@"title":source.title?:@"",@"windowId":@(source.windowID)});
   [stream startCaptureWithCompletionHandler:^(NSError *startError){if(startError){sendJSON(@{@"error":startError.localizedDescription});exit(5);}}];
  }
 }];
 [[NSRunLoop currentRunLoop] run];(void)sinks;
}return 0;}
