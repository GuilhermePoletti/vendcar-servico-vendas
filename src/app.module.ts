import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infrastructure/modules/prisma.module';
import { VendaModule } from './infrastructure/modules/venda.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    VendaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
