import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../documents/document.entity';
import { ExportsController } from './exports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Document])],
  controllers: [ExportsController],
})
export class ExportsModule {}
